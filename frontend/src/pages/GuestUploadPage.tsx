import { useState, useEffect } from 'react';
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
    const [uploading, setUploading] = useState(false);
    const [uploadedCount, setUploadedCount] = useState(0);
    const [done, setDone] = useState(false);
    const { token } = useParams<{ token: string }>();

    useEffect(() => {
        if (!token) return;
        async function loadPublicTrip() {
            try {
                const publicTrip = await getPublicTrip(token!);
                setTrip(publicTrip);
                setLoading(false);
            } catch (err) {
                setError(err instanceof Error ? err.message : 'Something went wrong');
                setLoading(false);
            }
        }
        loadPublicTrip();
    }, [token]);

    const handleUpload = async () => {
        setUploading(true);
        setUploadedCount(0);
        setDone(false);
        try {
            for (const file of files) {
                const baseUrl = await compressImage(file);
                const exifData = await exifr.parse(file, ['DateTimeOriginal']);
                let day = undefined;
                if (exifData?.DateTimeOriginal) {
                    const startDate = new Date(trip!.startDate);
                    const photoDate = new Date(exifData.DateTimeOriginal);
                    day = Math.floor((photoDate.getTime() - startDate.getTime()) / 86400000) + 1;
                    const totalDays = Math.round((new Date(trip!.endDate).getTime() - startDate.getTime()) / 86400000) + 1;
                    if (day < 1 || day > totalDays) {
                        day = undefined;
                    }
                }
                await addGuestPhoto(token!, { url: baseUrl, day: day });
                setUploadedCount(prev => prev + 1);
            }
            setDone(true);
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Something went wrong');
        } finally {
            setUploading(false);
            setFiles([]);
        }
    };

    return (
        <div>
            {loading && (
                <h2>Loading...</h2>
            )}
            {error && (
                <h2>{error}</h2>
            )}
            {trip && (
                <div>
                    <h2>{trip.title}</h2>
                    <h3>{trip.destination}</h3>
                    <input type="file" accept="image/*" multiple onChange={(e) => setFiles(Array.from(e.target.files ?? []))} />
                    {uploading && (
                        <p>Uploading {uploadedCount} of {files.length}...</p>
                    )}
                    {done && (
                        <p>Done!</p>
                    )}
                    <ul>
                        {files.map((f, i) => (
                            <li key={`${f.name}-${i}`}>{f.name} - {(f.size / 1024).toFixed(1)} KB</li>
                        ))}
                    </ul>
                    <button disabled={uploading || files.length === 0} onClick={() => handleUpload()}>Upload</button>
                </div>
            )}
        </div>
    );
}