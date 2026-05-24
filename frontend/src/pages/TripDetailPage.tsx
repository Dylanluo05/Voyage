import { Fragment, FormEvent, useCallback, useEffect, useMemo, useState, useRef } from 'react';
import { Link, useParams } from 'react-router-dom';
import {
  DndContext,
  DragEndEvent,
  PointerSensor,
  KeyboardSensor,
  closestCenter,
  useSensor,
  useSensors,
} from '@dnd-kit/core';
import {
  SortableContext,
  arrayMove,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import * as tripsApi from '../api/trips';
import type { Trip, ItineraryItem, ItemCategory, NewItemInput, Group, Debate } from '../types';
import { ApiError, API_URL, getToken } from '../api/client';
import SortableItineraryItem from '../components/SortableItineraryItem';
import SortableGroupBlock from '../components/SortableGroupBlock';
import SortableDebateCard from '../components/SortableDebateCard';
import DayColumn from '../components/DayColumn';
import CommuteWidget from '../components/CommuteWidget';
import CollaboratorsPanel from '../components/CollaboratorsPanel';
import { Autocomplete, useLoadScript } from '@react-google-maps/api';
import TripMap from '../components/TripMap';
import WeatherWidget from '../components/WeatherWidget';
import PlaylistPanel from '../components/PlaylistPanel';
import TripLogPanel from '../components/TripLogPanel';
import HotelsPanel from '../components/HotelsPanel';
import FlightsPanel from '../components/FlightsPanel';
import { compressImage, compressImageFromUrl } from '../utils/image';
import { useAuth } from '../context/AuthContext';
import BudgetPanel from '../components/BudgetPanel';
import ExpenseSplitPanel from '../components/ExpenseSplitPanel';
import SidequestsPanel from '../components/SidequestsPanel';
import TripNavBar from '../components/TripNavBar';
import DayAnchorEditor from '../components/DayAnchorEditor';
import TripChatPanel from '../components/TripChatPanel';

const GOOGLE_MAPS_LIBRARIES: ('places')[] = ['places'];

function formatCloseTime(hhmm: string): string {
  const [h, m] = hhmm.split(':').map(Number);
  const suffix = h < 12 ? 'AM' : 'PM';
  const hour = h === 0 ? 12 : h > 12 ? h - 12 : h;
  return `${hour}:${String(m).padStart(2, '0')} ${suffix}`;
}

function geocodeLocation(
  location: { name?: string; address?: string }
): Promise<{ lat: number; lng: number } | null> {
  return new Promise((resolve) => {
    const query = [location.name, location.address].filter(Boolean).join(' ');
    if (!query) { resolve(null); return; }
    const container = document.createElement('div');
    document.body.appendChild(container);
    const service = new google.maps.places.PlacesService(container);
    service.findPlaceFromQuery(
      { query, fields: ['geometry'] },
      (
        results: google.maps.places.PlaceResult[] | null,
        status: google.maps.places.PlacesServiceStatus
      ) => {
        document.body.removeChild(container);
        if (
          status === google.maps.places.PlacesServiceStatus.OK &&
          results?.[0]?.geometry?.location
        ) {
          resolve({
            lat: results[0].geometry!.location!.lat(),
            lng: results[0].geometry!.location!.lng(),
          });
        } else {
          resolve(null);
        }
      }
    );
  });
}

function getDayDate(startDate: string, day: number): string {
  const base = new Date(startDate);
  const date = new Date(
    Date.UTC(base.getUTCFullYear(), base.getUTCMonth(), base.getUTCDate() + (day - 1))
  );
  return date.toLocaleDateString('en-US', {
    weekday: 'short', month: 'short', day: 'numeric', timeZone: 'UTC',
  });
}

function daysBetween(start: string, end: string): number {
  const s = new Date(start);
  const e = new Date(end);
  const ms = e.getTime() - s.getTime();
  return Math.max(1, Math.round(ms / (1000 * 60 * 60 * 24)) + 1);
}

const emptyItem: NewItemInput = {
  day: 1,
  startTime: '',
  endTime: '',
  title: '',
  notes: '',
  cost: undefined,
  category: undefined,
  location: { name: '', address: '', lat: undefined, lng: undefined },
};

type TopLevelEntry =
  | { type: 'item'; item: ItineraryItem }
  | { type: 'group'; group: Group; items: ItineraryItem[] }
  | { type: 'debate'; debate: Debate };

export default function TripDetailPage() {
  const { id } = useParams<{ id: string }>();
  const { user } = useAuth();
  const [trip, setTrip] = useState<Trip | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [draft, setDraft] = useState<NewItemInput>(emptyItem);
  const [adding, setAdding] = useState(false);
  const [compressing, setCompressing] = useState(false);
  const [savingItemId, setSavingItemId] = useState<string | null>(null);
  const [addSuggestedPhotos, setAddSuggestedPhotos] = useState<string[]>([]);
  const [addUrlInput, setAddUrlInput] = useState('');
  const autocompleteRef = useRef<google.maps.places.Autocomplete | null>(null);
  const titleAutoRef = useRef<google.maps.places.Autocomplete | null>(null);
  const addImageRef = useRef<HTMLInputElement>(null);
  const addFetchTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [groupingDay, setGroupingDay] = useState<number | null>(null);
  const [selectedForGroup, setSelectedForGroup] = useState<string[]>([]);
  const [groupNameDraft, setGroupNameDraft] = useState('');
  const [creatingGroup, setCreatingGroup] = useState(false);
  const [creatingDebateDay, setCreatingDebateDay] = useState<number | null>(null);
  const [debateTitleDraft, setDebateTitleDraft] = useState('');
  const [debateOptionDrafts, setDebateOptionDrafts] = useState<string[]>(['', '']);
  const [submittingDebate, setSubmittingDebate] = useState(false);
  const [section, setSection] = useState('');
  const [addOpeningHours, setAddOpeningHours] = useState<google.maps.places.PlaceOpeningHours | null>(null);

  useEffect(() => {
    const mapSection = document.getElementById("map-section");
    const budgetSection = document.getElementById("budget-section");
    const hotelsSection = document.getElementById("hotels-section");
    const flightsSection = document.getElementById("flights-section");
    const sidequestsSection = document.getElementById("sidequests-section");
    const expensesSection = document.getElementById("expenses-section");
    const weatherSection = document.getElementById("weather-section");
    const collaboratorsSection = document.getElementById("collaborators-section");
    const tripPlaylistSection = document.getElementById("trip-playlist-section");
    const itinerarySection = document.getElementById("itinerary-section");

    switch (section) {
      case "map":
        mapSection?.scrollIntoView({
          behavior: "smooth",
          block: "start",
        });
        break;
      case "budget":
        budgetSection?.scrollIntoView({
          behavior: "smooth",
          block: "start",
        });
        break;
      case "hotels":
        hotelsSection?.scrollIntoView({
          behavior: "smooth",
          block: "start",
        });
        break;
      case "flights":
        flightsSection?.scrollIntoView({
          behavior: "smooth",
          block: "start",
        });
        break;
      case "sidequests":
        sidequestsSection?.scrollIntoView({
          behavior: "smooth",
          block: "start",
        });
        break;
      case "expenses":
        expensesSection?.scrollIntoView({
          behavior: "smooth",
          block: "start",
        });
        break;
      case "weather":
        weatherSection?.scrollIntoView({
          behavior: "smooth",
          block: "start",
        });
        break;
      case "collaborators":
        collaboratorsSection?.scrollIntoView({
          behavior: "smooth",
          block: "start",
        });
        break;
      case "trip-playlist":
        tripPlaylistSection?.scrollIntoView({
          behavior: "smooth",
          block: "start",
        });
        break;
      case "itinerary":
        itinerarySection?.scrollIntoView({
          behavior: "smooth",
          block: "start",
        });
        break;
      case "chat":
        document.getElementById("chat-section")?.scrollIntoView({ behavior: "smooth", block: "start" });
        break;
    }
  }, [section]);

  const titleRefCallback = useCallback((el: HTMLInputElement | null) => {
    if (titleAutoRef.current) {
      google.maps.event.clearInstanceListeners(titleAutoRef.current);
      titleAutoRef.current = null;
    }
    if (!el) return;
    titleAutoRef.current = new google.maps.places.Autocomplete(el, {
      fields: ['name', 'formatted_address', 'geometry', 'photos', 'opening_hours'],
    });
    titleAutoRef.current.addListener('place_changed', () => {
      const place = titleAutoRef.current!.getPlace();
      if (!place.name) return;
      setDraft((prev) => ({
        ...prev,
        title: place.name!,
        location: {
          name: place.name,
          address: place.formatted_address,
          lat: place.geometry?.location?.lat(),
          lng: place.geometry?.location?.lng(),
        },
      }));
      setAddOpeningHours(place.opening_hours ?? null);
      if (place.photos?.length) {
        setAddSuggestedPhotos(
          place.photos.slice(0, 4).map((p) => p.getUrl({ maxWidth: 600, maxHeight: 400 }))
        );
      }
    });
  }, []);
  const { isLoaded } = useLoadScript({
    googleMapsApiKey: import.meta.env.VITE_GOOGLE_MAPS_API_KEY,
    libraries: GOOGLE_MAPS_LIBRARIES,
  });

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 4 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  async function refresh() {
    if (!id) return;
    try {
      setLoading(true);
      setTrip(await tripsApi.getTrip(id));
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Failed to load trip');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    refresh();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  useEffect(() => {
    if (!id) return;
    const token = getToken();
    if (!token) return;
    const es = new EventSource(`${API_URL}/api/trips/${id}/events?token=${encodeURIComponent(token)}`);
    es.addEventListener('updated', () => {
      tripsApi.getTrip(id).then(setTrip).catch(() => {});
    });
    return () => es.close();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  useEffect(() => {
    if (!draft.title) { setAddSuggestedPhotos([]); return; }
    if (addFetchTimeoutRef.current) clearTimeout(addFetchTimeoutRef.current);
    addFetchTimeoutRef.current = setTimeout(() => {
      setAddSuggestedPhotos([]);
      const container = document.createElement('div');
      document.body.appendChild(container);
      const service = new google.maps.places.PlacesService(container);
      service.findPlaceFromQuery(
        { query: draft.title, fields: ['photos'] },
        (results, status) => {
          if (document.body.contains(container)) document.body.removeChild(container);
          if (status === google.maps.places.PlacesServiceStatus.OK && results?.[0]?.photos) {
            setAddSuggestedPhotos(
              results[0].photos.slice(0, 4).map((p) => p.getUrl({ maxWidth: 600, maxHeight: 400 }))
            );
          }
        }
      );
    }, 500);
    return () => { if (addFetchTimeoutRef.current) clearTimeout(addFetchTimeoutRef.current); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [draft.title]);

  const totalDays = useMemo(
    () => (trip ? daysBetween(trip.startDate, trip.endDate) : 1),
    [trip]
  );

  const topLevelByDay = useMemo(() => {
    const map = new Map<number, TopLevelEntry[]>();
    if (!trip) return map;
    for (let d = 1; d <= totalDays; d++) map.set(d, []);

    const groupItemsMap = new Map<string, ItineraryItem[]>();
    for (const item of trip.items) {
      if (item.groupId) {
        const arr = groupItemsMap.get(item.groupId) ?? [];
        arr.push(item);
        groupItemsMap.set(item.groupId, arr);
      }
    }

    for (const item of trip.items) {
      if (!item.groupId) {
        const arr = map.get(item.day) ?? [];
        arr.push({ type: 'item', item });
        map.set(item.day, arr);
      }
    }

    for (const group of (trip.groups ?? [])) {
      const arr = map.get(group.day) ?? [];
      const items = (groupItemsMap.get(group._id) ?? []).sort((a, b) => a.position - b.position);
      arr.push({ type: 'group', group, items });
      map.set(group.day, arr);
    }

    for (const debate of (trip.debates ?? [])) {
      const arr = map.get(debate.day) ?? [];
      arr.push({ type: 'debate', debate });
      map.set(debate.day, arr);
    }

    for (const arr of map.values()) {
      arr.sort((a, b) => {
        const posA = a.type === 'item' ? a.item.position : a.type === 'group' ? a.group.position : a.debate.position;
        const posB = b.type === 'item' ? b.item.position : b.type === 'group' ? b.group.position : b.debate.position;
        return posA - posB;
      });
    }

    return map;
  }, [trip, totalDays]);

  const orderedMapItems = useMemo(() => {
    const result: ItineraryItem[] = [];
    for (let d = 1; d <= totalDays; d++) {
      for (const entry of topLevelByDay.get(d) ?? []) {
        if (entry.type === 'item') result.push(entry.item);
        else if (entry.type === 'group') result.push(...entry.items);
      }
    }
    return result;
  }, [topLevelByDay, totalDays]);

  const suggestedEndTime = useMemo(() => {
    if (!addOpeningHours || !trip) return null;
    const base = new Date(trip.startDate);
    const tripDate = new Date(Date.UTC(base.getUTCFullYear(), base.getUTCMonth(), base.getUTCDate() + (draft.day - 1)));
    const dayOfWeek = tripDate.getUTCDay();
    const period = addOpeningHours.periods?.find((p) => p.open.day === dayOfWeek);
    if (!period?.close) return null;
    const t = period.close.time; // "HHMM"
    return `${t.slice(0, 2)}:${t.slice(2)}`;
  }, [addOpeningHours, draft.day, trip]);

  if (!isLoaded) return <div>Loading...</div>;

  async function handleAddImageFile(file: File) {
    setCompressing(true);
    try {
      const url = await compressImage(file);
      setDraft((prev) => ({ ...prev, imageUrl: url }));
    } catch {
      setError('Failed to process image');
    } finally {
      setCompressing(false);
    }
  }

  async function onAddItem(e: FormEvent) {
    e.preventDefault();
    if (!id) return;
    setError(null);
    setAdding(true);
    try {
      const hasLocation =
        !!draft.location?.name ||
        !!draft.location?.address ||
        draft.location?.lat !== undefined ||
        draft.location?.lng !== undefined;

      let loc = hasLocation
        ? {
          name: draft.location?.name,
          address: draft.location?.address,
          lat: draft.location?.lat,
          lng: draft.location?.lng,
        }
        : undefined;

      if (loc && !(loc.lat != null && loc.lng != null)) {
        const coords = await geocodeLocation(loc);
        if (coords) loc = { ...loc, ...coords };
      }

      const payload: NewItemInput = {
        day: Number(draft.day),
        title: draft.title,
        startTime: draft.startTime || undefined,
        endTime: draft.endTime || undefined,
        notes: draft.notes || undefined,
        imageUrl: draft.imageUrl || undefined,
        cost: draft.cost !== undefined && !Number.isNaN(draft.cost) ? Number(draft.cost) : undefined,
        category: draft.category || undefined,
        location: loc,
      };
      const updated = await tripsApi.addItem(id, payload);
      setTrip(updated);
      setDraft({ ...emptyItem, day: payload.day });
      setAddOpeningHours(null);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Failed to add item');
    } finally {
      setAdding(false);
    }
  }

  async function onSaveItem(itemId: string, patch: Partial<NewItemInput>) {
    if (!id) return;
    setSavingItemId(itemId);
    try {
      let resolvedPatch = patch;
      const loc = patch.location;
      if (loc && !(loc.lat != null && loc.lng != null) && (loc.name || loc.address)) {
        const coords = await geocodeLocation(loc);
        if (coords) resolvedPatch = { ...patch, location: { ...loc, ...coords } };
      }
      const updated = await tripsApi.updateItem(id, itemId, resolvedPatch);
      setTrip(updated);
    } catch (err) {
      throw err instanceof ApiError ? new Error(err.message) : err;
    } finally {
      setSavingItemId(null);
    }
  }

  async function onDeleteItem(itemId: string) {
    if (!id) return;
    try {
      const updated = await tripsApi.deleteItem(id, itemId);
      setTrip(updated);
    } catch (err) {
      throw err instanceof ApiError ? new Error(err.message) : err;
    }
  }


  async function onCreateGroup(day: number) {
    if (!id || selectedForGroup.length < 2 || !groupNameDraft.trim()) return;
    setCreatingGroup(true);
    try {
      const updated = await tripsApi.createGroup(id, {
        title: groupNameDraft.trim(),
        day,
        itemIds: selectedForGroup,
      });
      setTrip(updated);
      setGroupingDay(null);
      setSelectedForGroup([]);
      setGroupNameDraft('');
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Failed to create group');
    } finally {
      setCreatingGroup(false);
    }
  }

  async function onRenameGroup(groupId: string, title: string) {
    if (!id) return;
    try {
      const updated = await tripsApi.renameGroup(id, groupId, title);
      setTrip(updated);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Failed to rename group');
    }
  }

  async function onDissolveGroup(groupId: string) {
    if (!id) return;
    try {
      const updated = await tripsApi.dissolveGroup(id, groupId);
      setTrip(updated);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Failed to ungroup');
    }
  }

  async function onReactToItem(itemId: string, emoji: string) {
    if (!id) return;
    const updated = await tripsApi.reactToItem(id, itemId, emoji);
    setTrip(updated);
  }

  async function onCreateDebate(day: number) {
    if (!id || !debateTitleDraft.trim() || debateOptionDrafts.filter((o) => o.trim()).length < 2) return;
    setSubmittingDebate(true);
    try {
      const updated = await tripsApi.createDebate(id, {
        title: debateTitleDraft.trim(),
        day,
        options: debateOptionDrafts.filter((o) => o.trim()).map((o) => ({ title: o.trim() })),
      });
      setTrip(updated);
      setCreatingDebateDay(null);
      setDebateTitleDraft('');
      setDebateOptionDrafts(['', '']);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Failed to create debate');
    } finally {
      setSubmittingDebate(false);
    }
  }

  async function onDeleteDebate(debateId: string) {
    if (!id) return;
    const updated = await tripsApi.deleteDebate(id, debateId);
    setTrip(updated);
  }

  async function onAddDebateOption(debateId: string, title: string) {
    if (!id) return;
    const updated = await tripsApi.addDebateOption(id, debateId, title);
    setTrip(updated);
  }

  async function onUpdateDebateOption(
    debateId: string,
    optionId: string,
    patch: { pros?: string[]; cons?: string[] }
  ) {
    if (!id) return;
    const updated = await tripsApi.updateDebateOption(id, debateId, optionId, patch);
    setTrip(updated);
  }

  async function onDeleteDebateOption(debateId: string, optionId: string) {
    if (!id) return;
    const updated = await tripsApi.deleteDebateOption(id, debateId, optionId);
    setTrip(updated);
  }

  async function onVoteDebateOption(debateId: string, optionId: string) {
    if (!id) return;
    const updated = await tripsApi.voteDebateOption(id, debateId, optionId);
    setTrip(updated);
  }

  async function onAddDebateComment(debateId: string, text: string) {
    if (!id) return;
    const updated = await tripsApi.addDebateComment(id, debateId, text);
    setTrip(updated);
  }

  async function onDeleteDebateComment(debateId: string, commentId: string) {
    if (!id) return;
    const updated = await tripsApi.deleteDebateComment(id, debateId, commentId);
    setTrip(updated);
  }

  function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    if (!over || !trip || !id) return;
    if (active.id === over.id) return;

    const activeId = String(active.id);
    const overId = String(over.id);
    const isGroupDrag = activeId.startsWith('group-');
    const isDebateDrag = activeId.startsWith('debate-');

    // --- Within-group item reorder ---
    if (!isGroupDrag && !isDebateDrag) {
      const activeItem = trip.items.find((i) => i._id === activeId);
      if (!activeItem) return;

      if (activeItem.groupId) {
        const groupItems = trip.items
          .filter((i) => i.groupId === activeItem.groupId)
          .sort((a, b) => a.position - b.position);
        const fromIdx = groupItems.findIndex((i) => i._id === activeId);
        const toIdx = groupItems.findIndex((i) => i._id === overId);
        if (fromIdx === -1 || toIdx === -1) return;

        const reordered = arrayMove(groupItems, fromIdx, toIdx);
        const posMap = new Map(reordered.map((item, idx) => [item._id, idx]));
        const newItems = trip.items.map((i) =>
          posMap.has(i._id) ? { ...i, position: posMap.get(i._id)! } : i
        );
        setTrip({ ...trip, items: newItems });
        tripsApi
          .reorderItems(id, {
            items: reordered.map((item, idx) => ({ itemId: item._id, day: item.day, position: idx })),
          })
          .then(setTrip)
          .catch(() => refresh());
        return;
      }
    }

    // --- Top-level drag (standalone item or group) ---
    const activeDay = isGroupDrag
      ? trip.groups.find((g) => g._id === activeId.slice(6))?.day
      : isDebateDrag
        ? (trip.debates ?? []).find((d) => d._id === activeId.slice(7))?.day
        : trip.items.find((i) => i._id === activeId)?.day;
    if (activeDay === undefined) return;

    let targetDay = activeDay;
    if (overId.startsWith('day-')) {
      targetDay = Number(overId.slice(4));
    } else if (overId.startsWith('group-')) {
      targetDay = trip.groups.find((g) => g._id === overId.slice(6))?.day ?? activeDay;
    } else if (overId.startsWith('debate-')) {
      targetDay = (trip.debates ?? []).find((d) => d._id === overId.slice(7))?.day ?? activeDay;
    } else {
      const overItem = trip.items.find((i) => i._id === overId);
      if (overItem) targetDay = overItem.day;
    }

    // Groups and debates only move within their own day
    if ((isGroupDrag || isDebateDrag) && targetDay !== activeDay) return;

    const sourceTopLevel = topLevelByDay.get(activeDay) ?? [];
    const targetTopLevel = targetDay !== activeDay ? (topLevelByDay.get(targetDay) ?? []) : sourceTopLevel;

    const fromIdx = sourceTopLevel.findIndex((e) =>
      isGroupDrag
        ? e.type === 'group' && e.group._id === activeId.slice(6)
        : isDebateDrag
          ? e.type === 'debate' && e.debate._id === activeId.slice(7)
          : e.type === 'item' && e.item._id === activeId
    );
    if (fromIdx === -1) return;

    let toIdx: number;
    if (overId.startsWith('day-')) {
      toIdx = targetTopLevel.length;
    } else if (overId.startsWith('group-')) {
      const refList = activeDay === targetDay ? sourceTopLevel : targetTopLevel;
      toIdx = refList.findIndex((e) => e.type === 'group' && e.group._id === overId.slice(6));
    } else if (overId.startsWith('debate-')) {
      const refList = activeDay === targetDay ? sourceTopLevel : targetTopLevel;
      toIdx = refList.findIndex((e) => e.type === 'debate' && e.debate._id === overId.slice(7));
    } else {
      const refList = activeDay === targetDay ? sourceTopLevel : targetTopLevel;
      toIdx = refList.findIndex((e) => e.type === 'item' && e.item._id === overId);
      // overId may be an item inside a group (both SortableContexts share the outer DndContext).
      // Resolve it to the parent group's top-level position so the drag doesn't silently abort.
      if (toIdx === -1 && isGroupDrag) {
        const ownerGroupId = trip.items.find((i) => i._id === overId)?.groupId;
        if (ownerGroupId) {
          if (ownerGroupId === activeId.slice(6)) return; // hovering over own items — no-op
          toIdx = refList.findIndex((e) => e.type === 'group' && e.group._id === ownerGroupId);
        }
      }
    }

    const persistTopLevel = (
      updatedGroups: typeof trip.groups,
      updatedItems: typeof trip.items,
      updatedDebates: typeof trip.debates
    ) => {
      tripsApi
        .reorderItems(id, {
          items: updatedItems.filter((i) => !i.groupId).map((i) => ({
            itemId: i._id,
            day: i.day,
            position: i.position,
          })),
          groups: updatedGroups.map((g) => ({ groupId: g._id, day: g.day, position: g.position })),
          debates: updatedDebates.map((d) => ({ debateId: d._id, day: d.day, position: d.position })),
        })
        .then(setTrip)
        .catch(() => refresh());
    };

    // Same-day reorder
    if (activeDay === targetDay) {
      if (toIdx === -1) return;
      const reordered = arrayMove(sourceTopLevel, fromIdx, toIdx);
      const newGroups = trip.groups.map((g) => {
        if (g.day !== activeDay) return g;
        const idx = reordered.findIndex((e) => e.type === 'group' && e.group._id === g._id);
        return idx !== -1 ? { ...g, position: idx } : g;
      });
      const newDebates = (trip.debates ?? []).map((d) => {
        if (d.day !== activeDay) return d;
        const idx = reordered.findIndex((e) => e.type === 'debate' && e.debate._id === d._id);
        return idx !== -1 ? { ...d, position: idx } : d;
      });
      const newItems = trip.items.map((item) => {
        if (item.day !== activeDay || item.groupId) return item;
        const idx = reordered.findIndex((e) => e.type === 'item' && e.item._id === item._id);
        return idx !== -1 ? { ...item, position: idx } : item;
      });
      setTrip({ ...trip, groups: newGroups, items: newItems, debates: newDebates });
      persistTopLevel(newGroups, newItems, newDebates);
      return;
    }

    // Cross-day standalone item move
    const movingEntry = sourceTopLevel[fromIdx];
    if (movingEntry.type !== 'item') return;

    const newSourceTopLevel = sourceTopLevel.filter((_, i) => i !== fromIdx);
    const insertIdx = toIdx === -1 ? targetTopLevel.length : toIdx;
    const newTargetTopLevel: TopLevelEntry[] = [
      ...targetTopLevel.slice(0, insertIdx),
      { type: 'item', item: { ...movingEntry.item, day: targetDay } },
      ...targetTopLevel.slice(insertIdx),
    ];

    const buildPosMap = (list: TopLevelEntry[]) =>
      new Map(
        list.map((e, idx) => [
          e.type === 'group' ? `g:${e.group._id}`
            : e.type === 'debate' ? `d:${e.debate._id}`
              : `i:${e.item._id}`,
          idx,
        ])
      );
    const srcMap = buildPosMap(newSourceTopLevel);
    const tgtMap = buildPosMap(newTargetTopLevel);

    const newGroups = trip.groups.map((g) => {
      const key = `g:${g._id}`;
      if (srcMap.has(key)) return { ...g, position: srcMap.get(key)! };
      if (tgtMap.has(key)) return { ...g, position: tgtMap.get(key)! };
      return g;
    });
    const newDebates = (trip.debates ?? []).map((d) => {
      const key = `d:${d._id}`;
      if (srcMap.has(key)) return { ...d, position: srcMap.get(key)! };
      if (tgtMap.has(key)) return { ...d, position: tgtMap.get(key)! };
      return d;
    });
    const newItems = trip.items.map((item) => {
      if (item._id === movingEntry.item._id) {
        return { ...item, day: targetDay, position: tgtMap.get(`i:${item._id}`) ?? 0 };
      }
      const key = `i:${item._id}`;
      if (srcMap.has(key)) return { ...item, position: srcMap.get(key)! };
      if (tgtMap.has(key)) return { ...item, position: tgtMap.get(key)! };
      return item;
    });
    setTrip({ ...trip, groups: newGroups, items: newItems, debates: newDebates });
    persistTopLevel(newGroups, newItems, newDebates);
  }

  if (loading) return <div className="page">Loading…</div>;
  if (!trip)
    return (
      <div className="page">
        Trip not found. <Link to="/">Back</Link>
      </div>
    );

  return (
    <div className="page">
      <Link to="/trips" className="muted">
        &larr; All trips
      </Link>
      <div className="trip-title-row">
        <h1 style={{ margin: 0 }}>{trip.title}</h1>
        <div className="trip-title-actions">
          <button
            type="button"
            className="ghost small-btn"
            onClick={() => {
              const url = `${window.location.origin}/share/${trip.shareToken}`;
              navigator.clipboard.writeText(url).then(() => alert('Share link copied!'));
            }}
          >
            Share
          </button>
          <button
            type="button"
            className={trip.isCompleted ? 'ghost small-btn' : 'small-btn'}
            onClick={() =>
              tripsApi.markCompleted(trip._id, !trip.isCompleted).then(setTrip)
            }
          >
            {trip.isCompleted ? '✓ Completed' : 'Mark complete'}
          </button>
        </div>
      </div>
      <p className="muted">
        {trip.destination} · {new Date(trip.startDate).toLocaleDateString()} –{' '}
        {new Date(trip.endDate).toLocaleDateString()} · {totalDays} day
        {totalDays === 1 ? '' : 's'}
      </p>
      {trip.description && <p>{trip.description}</p>}

      <TripNavBar setSection={setSection} />

      <div id="map-section">
        <TripMap items={orderedMapItems} />
      </div>

      <div id="budget-section">
        <BudgetPanel trip={trip} onUpdate={setTrip} />
      </div>

      <div id="hotels-section">
        <HotelsPanel trip={trip} onUpdate={setTrip} />
      </div>

      <div id="flights-section">
        <FlightsPanel trip={trip} onUpdate={setTrip} />
      </div>

      <div id="sidequests-section">
        <SidequestsPanel trip={trip} currentUserId={user?.id} onUpdate={setTrip} />
      </div>

      <div id="expenses-section">
        <ExpenseSplitPanel trip={trip} currentUserId={user?.id} onUpdate={setTrip} />
      </div>

      <div id="weather-section">
        <WeatherWidget
          destination={trip.destination}
          startDate={trip.startDate.split('T')[0]}
          endDate={trip.endDate.split('T')[0]}
        />
      </div>

      <div id="collaborators-section">
        <CollaboratorsPanel
          trip={trip}
          isOwner={trip.owner._id === user?.id}
          onUpdate={setTrip}
        />
      </div>


      <div id="trip-playlist-section">
        <PlaylistPanel trip={trip} currentUserId={user?.id} onUpdate={setTrip} />
      </div>

      <div id="chat-section">
        <section className="card">
          <TripChatPanel
            trip={trip}
            onTripRefresh={() => id && tripsApi.getTrip(id).then(setTrip).catch(() => {})}
          />
        </section>
      </div>

      {trip.isCompleted && (
        <section className="card">
          <h2>Trip Log</h2>
          <TripLogPanel trip={trip} currentUserId={user?.id} onUpdate={setTrip} />
        </section>
      )}

      <section id="itinerary-section" className="card">
        <h2>Add itinerary item</h2>
        <form onSubmit={onAddItem} className="form grid-2">
          <label>
            Day
            <select
              value={draft.day}
              onChange={(e) => setDraft({ ...draft, day: Number(e.target.value) })}
            >
              {Array.from({ length: totalDays }, (_, i) => i + 1).map((d) => (
                <option key={d} value={d}>
                  Day {d}
                </option>
              ))}
            </select>
          </label>
          <label>
            Title
            <input
              ref={titleRefCallback}
              value={draft.title}
              onChange={(e) => setDraft({ ...draft, title: e.target.value })}
              required
              placeholder="Search a place or type a title…"
            />
          </label>
          <label>
            Start time
            <input
              type="time"
              value={draft.startTime ?? ''}
              onChange={(e) => setDraft({ ...draft, startTime: e.target.value })}
            />
          </label>
          <label>
            End time
            <input
              type="time"
              value={draft.endTime ?? ''}
              onChange={(e) => setDraft({ ...draft, endTime: e.target.value })}
            />
            {suggestedEndTime && (
              <button
                type="button"
                className="close-time-suggestion"
                onClick={() => setDraft((prev) => ({ ...prev, endTime: suggestedEndTime }))}
              >
                Closes {formatCloseTime(suggestedEndTime)}
              </button>
            )}
          </label>
          <label>
            Cost ($)
            <input
              type="number"
              min="0"
              step="0.01"
              placeholder="Optional"
              value={draft.cost ?? ''}
              onChange={(e) =>
                setDraft({ ...draft, cost: e.target.value === '' ? undefined : Number(e.target.value) })
              }
            />
          </label>
          <label>
            Category
            <select
              value={draft.category ?? ''}
              onChange={(e) =>
                setDraft({ ...draft, category: (e.target.value as ItemCategory) || undefined })
              }
            >
              <option value="">None</option>
              <option value="food">Food</option>
              <option value="activity">Activity</option>
              <option value="attraction">Attraction</option>
            </select>
          </label>
          <label className="full-width">
            Notes
            <textarea
              value={draft.notes ?? ''}
              onChange={(e) => setDraft({ ...draft, notes: e.target.value })}
              rows={2}
            />
          </label>
          <fieldset className="full-width">
            <legend>Location (optional)</legend>
            <div className="grid-2">
              <label className="full-width">
                Address
                <Autocomplete
                  onLoad={(autocomplete) => {
                    autocompleteRef.current = autocomplete;
                  }}

                  onPlaceChanged={() => {
                    const place = autocompleteRef.current?.getPlace();
                    if (!place) return;
                    const address = place.formatted_address;
                    const lat = place.geometry?.location?.lat();
                    const lng = place.geometry?.location?.lng();
                    setDraft((prev) => ({
                      ...prev,
                      location: {
                        ...(prev.location ?? {}),
                        name: place.name,
                        address,
                        lat,
                        lng,
                      },
                    }));
                  }}
                >
                  <input
                    type="text"
                    placeholder="Search location..."
                    value={draft.location?.address ?? ''}
                    onChange={(e) =>
                      setDraft((prev) => ({
                        ...prev,
                        location: {
                          ...(prev.location ?? {}),
                          address: e.target.value,
                        },
                      }))
                    }
                  />
                </Autocomplete>
              </label>
            </div>
          </fieldset>
          <fieldset className="full-width">
            <legend>Photo (optional)</legend>
            {draft.imageUrl ? (
              <div className="img-preview-wrap">
                <img src={draft.imageUrl} alt="preview" className="img-preview" />
                <button
                  type="button"
                  className="ghost img-remove-btn"
                  onClick={() => setDraft((prev) => ({ ...prev, imageUrl: undefined }))}
                >
                  Remove photo
                </button>
              </div>
            ) : (
              <div className="photo-options">
                <div className="photo-url-row">
                  <input
                    type="url"
                    placeholder="Paste image URL…"
                    value={addUrlInput}
                    onChange={(e) => setAddUrlInput(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        if (addUrlInput) { setDraft((prev) => ({ ...prev, imageUrl: addUrlInput })); setAddUrlInput(''); }
                      }
                    }}
                  />
                  <button
                    type="button"
                    className="ghost small-btn"
                    disabled={!addUrlInput}
                    onClick={() => { setDraft((prev) => ({ ...prev, imageUrl: addUrlInput })); setAddUrlInput(''); }}
                  >
                    Use
                  </button>
                </div>
                <button
                  type="button"
                  className="ghost"
                  onClick={() => addImageRef.current?.click()}
                  disabled={compressing}
                >
                  {compressing ? 'Processing…' : '+ Upload from device'}
                </button>
                {addSuggestedPhotos.length > 0 && (
                  <div className="photo-suggestions-wrap">
                    <span className="small muted">Suggested</span>
                    <div className="photo-suggestions">
                      {addSuggestedPhotos.map((url, i) => (
                        <img
                          key={i}
                          src={url}
                          alt="suggestion"
                          className="photo-suggestion-thumb"
                          onClick={async () => {
                            try {
                              const base64 = await compressImageFromUrl(url);
                              setDraft((prev) => ({ ...prev, imageUrl: base64 }));
                            } catch {
                              setDraft((prev) => ({ ...prev, imageUrl: url }));
                            }
                          }}
                        />
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}
            <input
              ref={addImageRef}
              type="file"
              accept="image/*"
              style={{ display: 'none' }}
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) handleAddImageFile(file);
                e.target.value = '';
              }}
            />
          </fieldset>
          {error && <div className="error full-width">{error}</div>}
          <button className="full-width" type="submit" disabled={adding || compressing}>
            {adding ? 'Adding…' : 'Add item'}
          </button>
        </form>
      </section>

      <section>
        <h2>Itinerary</h2>
        <p className="muted small">
          Drag the <span className="kbd">⋮⋮</span> handle to reorder within a day or move
          items to another day. Click <em>Edit</em> to modify any field.
        </p>
        <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
          {Array.from({ length: totalDays }, (_, i) => i + 1).map((day) => {
            const topLevel = topLevelByDay.get(day) ?? [];
            const isGroupingThisDay = groupingDay === day;
            const standaloneItems = topLevel
              .filter((e): e is { type: 'item'; item: ItineraryItem } => e.type === 'item')
              .map((e) => e.item);
            const sortableIds = topLevel.map((e) =>
              e.type === 'item' ? e.item._id
                : e.type === 'group' ? `group-${e.group._id}`
                  : `debate-${e.debate._id}`
            );
            const isCreatingDebateThisDay = creatingDebateDay === day;
            const anchor = (trip.dayAnchors ?? []).find((a) => a.day === day);

            const firstEntry = topLevel[0];
            const firstItem =
              firstEntry?.type === 'item' ? firstEntry.item :
              firstEntry?.type === 'group' ? firstEntry.items[0] :
              undefined;

            const lastEntry = topLevel[topLevel.length - 1];
            const lastItem =
              lastEntry?.type === 'item' ? lastEntry.item :
              lastEntry?.type === 'group' ? lastEntry.items[lastEntry.items.length - 1] :
              undefined;

            const hasAnchorLoc = (loc: ItineraryItem['location']) =>
              loc !== undefined &&
              ((loc.lat !== undefined && loc.lng !== undefined) || !!loc.address || !!loc.name);

            const showStartCommute = !!anchor?.startAddress && firstItem && hasAnchorLoc(firstItem.location);
            const showEndCommute = !!anchor?.endAddress && lastItem && hasAnchorLoc(lastItem.location);

            return (
              <DayColumn key={day} day={day} date={getDayDate(trip.startDate, day)} isEmpty={topLevel.length === 0}>
                {isGroupingThisDay ? (
                  <div className="grouping-ui">
                    <p className="small muted">Select 2+ items to group:</p>
                    {standaloneItems.map((item) => (
                      <label key={item._id} className="grouping-checkbox-row">
                        <input
                          type="checkbox"
                          checked={selectedForGroup.includes(item._id)}
                          onChange={(e) =>
                            setSelectedForGroup((prev) =>
                              e.target.checked
                                ? [...prev, item._id]
                                : prev.filter((sid) => sid !== item._id)
                            )
                          }
                        />
                        <span>{item.title}</span>
                      </label>
                    ))}
                    {selectedForGroup.length >= 2 && (
                      <div className="grouping-name-row">
                        <input
                          placeholder="Group name…"
                          value={groupNameDraft}
                          onChange={(e) => setGroupNameDraft(e.target.value)}
                          className="grouping-name-input"
                        />
                        <button
                          type="button"
                          className="small-btn"
                          disabled={!groupNameDraft.trim() || creatingGroup}
                          onClick={() => onCreateGroup(day)}
                        >
                          {creatingGroup ? 'Creating…' : 'Create group'}
                        </button>
                      </div>
                    )}
                    <button
                      type="button"
                      className="ghost small-btn"
                      onClick={() => {
                        setGroupingDay(null);
                        setSelectedForGroup([]);
                        setGroupNameDraft('');
                      }}
                    >
                      Cancel
                    </button>
                  </div>
                ) : (
                  <div className="day-action-row">
                    {standaloneItems.length >= 2 && (
                      <button
                        type="button"
                        className="ghost small-btn"
                        onClick={() => {
                          setGroupingDay(day);
                          setSelectedForGroup([]);
                          setGroupNameDraft('');
                          setCreatingDebateDay(null);
                        }}
                      >
                        + Group items
                      </button>
                    )}
                    {isCreatingDebateThisDay ? (
                      <div className="debate-create-ui">
                        <input
                          placeholder="Debate title…"
                          value={debateTitleDraft}
                          onChange={(e) => setDebateTitleDraft(e.target.value)}
                          className="debate-create-input"
                        />
                        {debateOptionDrafts.map((opt, i) => (
                          <div key={i} className="debate-option-draft-row">
                            <input
                              placeholder={`Option ${i + 1}…`}
                              value={opt}
                              onChange={(e) =>
                                setDebateOptionDrafts((prev) =>
                                  prev.map((v, j) => (j === i ? e.target.value : v))
                                )
                              }
                              className="debate-create-input"
                            />
                            {debateOptionDrafts.length > 2 && (
                              <button
                                type="button"
                                className="ghost small-btn"
                                onClick={() =>
                                  setDebateOptionDrafts((prev) => prev.filter((_, j) => j !== i))
                                }
                              >
                                ✕
                              </button>
                            )}
                          </div>
                        ))}
                        {debateOptionDrafts.length < 6 && (
                          <button
                            type="button"
                            className="ghost small-btn"
                            onClick={() => setDebateOptionDrafts((prev) => [...prev, ''])}
                          >
                            + Add option
                          </button>
                        )}
                        <div className="debate-create-actions">
                          <button
                            type="button"
                            className="small-btn"
                            disabled={
                              !debateTitleDraft.trim() ||
                              debateOptionDrafts.filter((o) => o.trim()).length < 2 ||
                              submittingDebate
                            }
                            onClick={() => onCreateDebate(day)}
                          >
                            {submittingDebate ? 'Creating…' : 'Create debate'}
                          </button>
                          <button
                            type="button"
                            className="ghost small-btn"
                            onClick={() => {
                              setCreatingDebateDay(null);
                              setDebateTitleDraft('');
                              setDebateOptionDrafts(['', '']);
                            }}
                          >
                            Cancel
                          </button>
                        </div>
                      </div>
                    ) : (
                      <button
                        type="button"
                        className="ghost small-btn"
                        onClick={() => {
                          setCreatingDebateDay(day);
                          setDebateTitleDraft('');
                          setDebateOptionDrafts(['', '']);
                          setGroupingDay(null);
                        }}
                      >
                        + Debate
                      </button>
                    )}
                  </div>
                )}

                <DayAnchorEditor
                  trip={trip}
                  day={day}
                  anchor={anchor}
                  onUpdate={setTrip}
                />

                {showStartCommute && (
                  <ul className="item-list">
                    <li className="commute-row">
                      <CommuteWidget
                        origin={{ address: anchor!.startAddress }}
                        destination={firstItem!.location!}
                      />
                    </li>
                  </ul>
                )}

                <SortableContext items={sortableIds} strategy={verticalListSortingStrategy}>
                  <ul className="item-list">
                    {topLevel.map((entry, idx) => {
                      if (entry.type === 'group') {
                        const nextEntry = topLevel[idx + 1];
                        const lastItem = entry.items[entry.items.length - 1];
                        const nextItem =
                          nextEntry?.type === 'item' ? nextEntry.item :
                          nextEntry?.type === 'group' ? nextEntry.items[0] :
                          undefined;
                        const hasLoc = (loc: typeof lastItem.location) =>
                          loc !== undefined &&
                          ((loc.lat !== undefined && loc.lng !== undefined) || !!loc.address || !!loc.name);
                        const showCommute =
                          lastItem !== undefined &&
                          nextItem !== undefined &&
                          hasLoc(lastItem.location) &&
                          hasLoc(nextItem.location);
                        return (
                          <Fragment key={`group-${entry.group._id}`}>
                            <li>
                              <SortableGroupBlock
                                group={entry.group}
                                items={entry.items}
                                totalDays={totalDays}
                                savingItemId={savingItemId}
                                onSaveItem={onSaveItem}
                                onDeleteItem={onDeleteItem}
                                onReactToItem={onReactToItem}
                                onRename={(title) => onRenameGroup(entry.group._id, title)}
                                onDissolve={() => onDissolveGroup(entry.group._id)}
                                currentUserId={user?.id}
                              />
                            </li>
                            {showCommute && (
                              <li className="commute-row">
                                <CommuteWidget origin={lastItem.location!} destination={nextItem.location!} />
                              </li>
                            )}
                          </Fragment>
                        );
                      }
                      if (entry.type === 'debate') {
                        return (
                          <li key={`debate-${entry.debate._id}`}>
                            <SortableDebateCard
                              debate={entry.debate}
                              currentUserId={user?.id}
                              onDelete={() => onDeleteDebate(entry.debate._id)}
                              onAddOption={(title) => onAddDebateOption(entry.debate._id, title)}
                              onUpdateOption={(optId, patch) => onUpdateDebateOption(entry.debate._id, optId, patch)}
                              onDeleteOption={(optId) => onDeleteDebateOption(entry.debate._id, optId)}
                              onVoteOption={(optId) => onVoteDebateOption(entry.debate._id, optId)}
                              onAddComment={(text) => onAddDebateComment(entry.debate._id, text)}
                              onDeleteComment={(cId) => onDeleteDebateComment(entry.debate._id, cId)}
                            />
                          </li>
                        );
                      }
                      const item = entry.item;
                      const nextEntry = topLevel[idx + 1];
                      const nextItem =
                        nextEntry?.type === 'item' ? nextEntry.item :
                        nextEntry?.type === 'group' ? nextEntry.items[0] :
                        undefined;
                      const hasLoc = (loc: typeof item.location) =>
                        loc !== undefined &&
                        ((loc.lat !== undefined && loc.lng !== undefined) ||
                          !!loc.address ||
                          !!loc.name);
                      const showCommute =
                        nextItem !== undefined &&
                        hasLoc(item.location) &&
                        hasLoc(nextItem.location);
                      return (
                        <Fragment key={item._id}>
                          <li>
                            <SortableItineraryItem
                              item={item}
                              totalDays={totalDays}
                              saving={savingItemId === item._id}
                              onSave={(patch) => onSaveItem(item._id, patch)}
                              onDelete={() => onDeleteItem(item._id)}
                              currentUserId={user?.id}
                              onReact={(emoji) => onReactToItem(item._id, emoji)}
                            />
                          </li>
                          {showCommute && (
                            <li className="commute-row">
                              <CommuteWidget
                                origin={item.location!}
                                destination={nextItem!.location!}
                              />
                            </li>
                          )}
                        </Fragment>
                      );
                    })}
                  </ul>
                </SortableContext>

                {showEndCommute && (
                  <ul className="item-list">
                    <li className="commute-row">
                      <CommuteWidget
                        origin={lastItem!.location!}
                        destination={{ address: anchor!.endAddress }}
                      />
                    </li>
                  </ul>
                )}
              </DayColumn>
            );
          })}
        </DndContext>
      </section>
    </div>
  );
}
