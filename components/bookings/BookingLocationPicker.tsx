"use client";

import { FormEvent, useCallback, useEffect, useRef, useState } from "react";
import * as L from "leaflet";
import { Crosshair, MapPin, Navigation, Save, Search, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

interface Coordinates {
  latitude: number;
  longitude: number;
}

interface SearchResult extends Coordinates {
  label: string;
}

interface BookingLocationPickerProps {
  initialLabel: string;
  initialLatitude: number | null;
  initialLongitude: number | null;
  isSaving: boolean;
  onClear: () => void;
  onSave: (location: SearchResult) => void;
}

const PANDI_CENTER: [number, number] = [14.865, 120.957];

export default function BookingLocationPicker({
  initialLabel,
  initialLatitude,
  initialLongitude,
  isSaving,
  onClear,
  onSave,
}: BookingLocationPickerProps) {
  const initialPin = initialLatitude != null && initialLongitude != null
    ? { latitude: initialLatitude, longitude: initialLongitude }
    : null;
  const [label, setLabel] = useState(initialLabel);
  const [pin, setPin] = useState<Coordinates | null>(initialPin);
  const [mapTarget, setMapTarget] = useState<Coordinates | null>(initialPin);
  const [query, setQuery] = useState(initialLabel);
  const [results, setResults] = useState<SearchResult[]>([]);
  const [searching, setSearching] = useState(false);
  const [error, setError] = useState("");
  const mapElementRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<L.Map | null>(null);
  const markerRef = useRef<L.CircleMarker | null>(null);
  const selectedQueryRef = useRef("");
  const searchRequestRef = useRef(0);

  useEffect(() => {
    const element = mapElementRef.current;
    if (!element || mapRef.current) return;

    const map = L.map(element, {
      center: initialPin ? [initialPin.latitude, initialPin.longitude] : PANDI_CENTER,
      zoom: initialPin ? 16 : 12,
      scrollWheelZoom: true,
    });
    L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
    }).addTo(map);
    map.on("click", (event: L.LeafletMouseEvent) => {
      setPin({ latitude: event.latlng.lat, longitude: event.latlng.lng });
      setMapTarget(null);
    });
    mapRef.current = map;

    return () => {
      map.off();
      map.remove();
      mapRef.current = null;
      markerRef.current = null;
    };
  // The booking drawer remounts the picker when its saved coordinates change.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;
    if (!pin) {
      markerRef.current?.remove();
      markerRef.current = null;
      return;
    }

    const latLng: L.LatLngExpression = [pin.latitude, pin.longitude];
    if (markerRef.current) {
      markerRef.current.setLatLng(latLng);
    } else {
      markerRef.current = L.circleMarker(latLng, {
        radius: 9,
        color: "#ffffff",
        fillColor: "#f59e0b",
        fillOpacity: 1,
        weight: 3,
      }).addTo(map);
    }
    map.panInside(latLng);
  }, [pin]);

  useEffect(() => {
    if (mapTarget && mapRef.current) {
      mapRef.current.flyTo([mapTarget.latitude, mapTarget.longitude], 16);
    }
  }, [mapTarget]);

  const findLocations = useCallback(async (cleanQuery: string, signal?: AbortSignal) => {
    const requestId = ++searchRequestRef.current;
    setSearching(true);
    setError("");
    try {
      const response = await fetch(
        `https://nominatim.openstreetmap.org/search?format=jsonv2&limit=5&countrycodes=ph&q=${encodeURIComponent(cleanQuery)}`,
        { signal }
      );
      if (!response.ok) throw new Error("Search unavailable");
      const data = await response.json() as Array<{ display_name: string; lat: string; lon: string }>;
      if (requestId !== searchRequestRef.current) return;
      setResults(data.map((item) => ({
        label: item.display_name,
        latitude: Number(item.lat),
        longitude: Number(item.lon),
      })));
      if (data.length === 0) setError("No matching place found. You can still tap the map to place the pin.");
    } catch (searchError) {
      if (searchError instanceof DOMException && searchError.name === "AbortError") return;
      if (requestId !== searchRequestRef.current) return;
      setError("Location search is unavailable. Tap the map to place the pin manually.");
    } finally {
      if (requestId === searchRequestRef.current) setSearching(false);
    }
  }, []);

  useEffect(() => {
    const cleanQuery = query.trim();
    if (selectedQueryRef.current === cleanQuery) {
      selectedQueryRef.current = "";
      return;
    }
    if (cleanQuery.length < 3) {
      searchRequestRef.current++;
      setResults([]);
      setSearching(false);
      return;
    }

    const controller = new AbortController();
    const timeout = window.setTimeout(() => {
      void findLocations(cleanQuery, controller.signal);
    }, 650);
    return () => {
      window.clearTimeout(timeout);
      controller.abort();
    };
  }, [findLocations, query]);

  const searchLocation = (event: FormEvent) => {
    event.preventDefault();
    const cleanQuery = query.trim();
    if (cleanQuery.length < 3) return;
    void findLocations(cleanQuery);
  };

  const chooseResult = (result: SearchResult) => {
    selectedQueryRef.current = result.label;
    setLabel(result.label);
    setQuery(result.label);
    setPin(result);
    setMapTarget(result);
    setResults([]);
  };

  const useCurrentLocation = () => {
    setError("");
    if (!navigator.geolocation) {
      setError("Current location is not available in this browser.");
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (position) => {
        const current = { latitude: position.coords.latitude, longitude: position.coords.longitude };
        setPin(current);
        setMapTarget(current);
        if (!label) setLabel("Pinned location");
      },
      () => setError("Location permission was not granted."),
      { enableHighAccuracy: true, timeout: 10000 }
    );
  };

  const googleMapsUrl = pin
    ? `https://www.google.com/maps/dir/?api=1&destination=${pin.latitude},${pin.longitude}&travelmode=driving`
    : null;
  const wazeUrl = pin
    ? `https://www.waze.com/ul?ll=${pin.latitude},${pin.longitude}&navigate=yes`
    : null;

  return (
    <div className="space-y-3">
      <form onSubmit={searchLocation} className="flex gap-2">
        <Input
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="Search address or venue"
          role="combobox"
          aria-autocomplete="list"
          aria-expanded={results.length > 0}
          aria-controls="booking-location-suggestions"
          className="bg-charcoal-800 border-charcoal-700 text-white placeholder:text-charcoal-500"
        />
        <Button type="submit" disabled={searching} size="icon" className="shrink-0 bg-charcoal-800 hover:bg-charcoal-700" title="Search location">
          <Search size={16} />
        </Button>
      </form>

      {results.length > 0 && (
        <div id="booking-location-suggestions" role="listbox" className="max-h-40 overflow-y-auto rounded-lg border border-charcoal-700 bg-charcoal-950">
          {results.map((result) => (
            <button
              key={`${result.latitude}-${result.longitude}`}
              type="button"
              role="option"
              aria-selected="false"
              onClick={() => chooseResult(result)}
              className="flex w-full items-start gap-2 border-b border-charcoal-800 px-3 py-2 text-left text-xs text-charcoal-300 last:border-0 hover:bg-charcoal-800"
            >
              <MapPin size={13} className="mt-0.5 shrink-0 text-brand-400" />
              {result.label}
            </button>
          ))}
        </div>
      )}

      <div className="h-64 overflow-hidden rounded-lg border border-charcoal-700">
        <div ref={mapElementRef} className="h-full w-full" />
      </div>

      <Button type="button" onClick={useCurrentLocation} variant="outline" className="w-full border-charcoal-700 text-charcoal-300 hover:bg-charcoal-800 hover:text-white">
        <Crosshair size={14} className="mr-2" /> Pin My Current Location
      </Button>

      <Input
        value={label}
        onChange={(event) => setLabel(event.target.value)}
        placeholder="Location name, venue, or client address"
        className="bg-charcoal-800 border-charcoal-700 text-white placeholder:text-charcoal-500"
      />

      {error && <p className="text-xs leading-4 text-amber-400">{error}</p>}

      {pin && (
        <div className="grid grid-cols-2 gap-2">
          <a href={googleMapsUrl!} target="_blank" rel="noopener noreferrer" className="inline-flex h-9 items-center justify-center rounded-md border border-charcoal-700 text-xs font-medium text-charcoal-200 hover:bg-charcoal-800">
            <Navigation size={14} className="mr-2" /> Google Maps
          </a>
          <a href={wazeUrl!} target="_blank" rel="noopener noreferrer" className="inline-flex h-9 items-center justify-center rounded-md border border-sky-500/30 text-xs font-medium text-sky-300 hover:bg-sky-500/10">
            <Navigation size={14} className="mr-2" /> Waze
          </a>
        </div>
      )}

      <div className="flex gap-2">
        {initialPin && (
          <Button type="button" onClick={onClear} disabled={isSaving} variant="outline" size="icon" className="border-red-500/30 text-red-400 hover:bg-red-500/10" title="Remove saved location">
            <Trash2 size={15} />
          </Button>
        )}
        <Button
          type="button"
          onClick={() => pin && onSave({ ...pin, label: label.trim() || "Pinned location" })}
          disabled={isSaving || !pin}
          className="flex-1 bg-brand-500 text-white hover:bg-brand-600"
        >
          <Save size={14} className="mr-2" /> Save Destination
        </Button>
      </div>
    </div>
  );
}
