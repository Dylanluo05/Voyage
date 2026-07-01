import { useState, useEffect, useRef } from 'react';
import { useParams } from 'react-router-dom';
import { Trip } from '../types';
import { addGuestPhoto, getPublicTrip } from '../api/trips';
import { compressImage } from '../utils/image';
import exifr from 'exifr';

export default function GuestUploadPage() {
    const [trip, setTrip] = useState<Trip | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [files, setFiles] = useState<File[]>([]);
    const [previews, setPreviews] = useState<string[]>([]);
    const [uploading, setUploading] = useState(false);
    const [uploadedCount, setUploadedCount] = useState(0);
    const [done, setDone] = useState(false);
    const { token } = useParams<{ token: string }>();
    const fileInputRef = useRef<HTMLInputElement>(null);

    useEffect(() => {
        if (!token) return;
        getPublicTrip(token)
            .then(setTrip)
            .catch(err => setError(err instanceof Error ? err.message : 'Trip not found or link has expired.'))
            .finally(() => setLoading(false));
    }, [token]);

    function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
        const selected = Array.from(e.target.files ?? []);
        setFiles(selected);
        setDone(false);
        setError('');
        const urls = selected.map(f => URL.createObjectURL(f));
        setPreviews(urls);
    }

    const handleUpload = async () => {
        setUploading(true);
        setUploadedCount(0);
        setDone(false);
        setError('');
        try {
            for (const file of files) {
                const baseUrl = await compressImage(file);
                const exifData = await exifr.parse(file, ['DateTimeOriginal']);
                let day: number | undefined;
                if (exifData?.DateTimeOriginal) {
                    const startDate = new Date(trip!.startDate);
                    const photoDate = new Date(exifData.DateTimeOriginal);
                    day = Math.floor((photoDate.getTime() - startDate.getTime()) / 86400000) + 1;
                    const totalDays = Math.round((new Date(trip!.endDate).getTime() - startDate.getTime()) / 86400000) + 1;
                    if (day < 1 || day > totalDays) day = undefined;
                }
                await addGuestPhoto(token!, { url: baseUrl, day });
                setUploadedCount(prev => prev + 1);
            }
            setDone(true);
            setFiles([]);
            setPreviews([]);
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Upload failed. Please try again.');
        } finally {
            setUploading(false);
        }
    };

    if (loading) {
        return (
            <div className="page">
                <div className="card" style={{ maxWidth: 480, margin: '80px auto', textAlign: 'center' }}>
                    <p className="muted">Loading trip…</p>
                </div>
            </div>
        );
    }

    if (error && !trip) {
        return (
            <div className="page">
                <div className="card" style={{ maxWidth: 480, margin: '80px auto', textAlign: 'center' }}>
                    <h2 style={{ marginBottom: 8 }}>Link unavailable</h2>
                    <p className="muted">{error}</p>
                </div>
            </div>
        );
    }

    return (
        <div className="page">
            <div className="card" style={{ maxWidth: 520, margin: '60px auto' }}>
                <div style={{ marginBottom: 24 }}>
                    <p className="muted small" style={{ marginBottom: 4 }}>You're contributing to</p>
                    <h1 style={{ margin: 0, fontSize: '1.5rem' }}>{trip!.title}</h1>
                    {trip!.destination && (
                        <p className="muted small" style={{ marginTop: 4 }}>📍 {trip!.destination}</p>
                    )}
                </div>

                {done ? (
                    <div style={{ textAlign: 'center', padding: '32px 0' }}>
                        <div style={{ fontSize: '2.5rem', marginBottom: 12 }}>🎉</div>
                        <h2 style={{ marginBottom: 8 }}>Photos uploaded!</h2>
                        <p className="muted">Your photos have been added to the trip. Thank you!</p>
                        <button
                            type="button"
                            className="ghost"
                            style={{ marginTop: 20 }}
                            onClick={() => { setDone(false); setError(''); }}
                        >
                            Upload more photos
                        </button>
                    </div>
                ) : (
                    <>
                        <div
                            className="proof-upload-area"
                            onClick={() => fileInputRef.current?.click()}
                            style={{ marginBottom: 16 }}
                        >
                            <input
                                ref={fileInputRef}
                                type="file"
                                accept="image/*"
                                multiple
                                style={{ display: 'none' }}
                                onChange={handleFileChange}
                            />
                            {files.length === 0 ? (
                                <span className="proof-upload-hint">
                                    Click to choose photos from your device
                                </span>
                            ) : (
                                <span className="proof-upload-hint">
                                    {files.length} photo{files.length !== 1 ? 's' : ''} selected — click to change
                                </span>
                            )}
                        </div>

                        {previews.length > 0 && (
                            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(80px, 1fr))', gap: 8, marginBottom: 16 }}>
                                {previews.map((url, i) => (
                                    <img
                                        key={i}
                                        src={url}
                                        alt=""
                                        style={{ width: '100%', aspectRatio: '1', objectFit: 'cover', borderRadius: 8 }}
                                    />
                                ))}
                            </div>
                        )}

                        {uploading && (
                            <p className="muted small" style={{ marginBottom: 8, textAlign: 'center' }}>
                                Uploading {uploadedCount} of {files.length}…
                            </p>
                        )}

                        {error && <p className="error" style={{ marginBottom: 8 }}>{error}</p>}

                        <button
                            type="button"
                            disabled={uploading || files.length === 0}
                            style={{ width: '100%' }}
                            onClick={handleUpload}
                        >
                            {uploading ? `Uploading… (${uploadedCount}/${files.length})` : `Upload ${files.length > 0 ? files.length : ''} Photo${files.length !== 1 ? 's' : ''}`}
                        </button>

                        <p className="muted small" style={{ marginTop: 12, textAlign: 'center' }}>
                            Photos with GPS/date metadata will be automatically sorted into the right day.
                        </p>
                    </>
                )}
            </div>
        </div>
    );
}
