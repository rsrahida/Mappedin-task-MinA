import {
  MapView,
  useMapData,
  useMap,
  Marker,
  useMapViewEvent,
} from "@mappedin/react-sdk";
import { Search, FloorSelector, ZoomControls } from "@mappedin/react-ui";
import { useCallback, useEffect, useMemo, useState } from "react";
import type { Floor, LocationProfile } from "@mappedin/mappedin-js";
import "@mappedin/react-ui/themes/mappedin-light.css";
import { DOORS } from "@mappedin/mappedin-js";

function MapUI({ mapView, mapData }: { mapView: any; mapData: any }) {
  const [currentFloor, setCurrentFloor] = useState<Floor>(mapView.currentFloor);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedLocation, setSelectedLocation] =
    useState<LocationProfile | null>(null);

  useEffect(() => {
    const handleFloorChange = (payload: any) => setCurrentFloor(payload.floor);
    mapView.on("floor-change", handleFloorChange);
    return () => mapView.off("floor-change", handleFloorChange);
  }, [mapView]);

  const handleFloorSelected = useCallback(
    (floor: Floor) => mapView.setFloor(floor),
    [mapView],
  );

  const defaultResults = useMemo(
    () =>
      [...mapData.getByType("location-profile")]
        .filter((x: any) => x.spaces.length > 0)
        .sort((a: any, b: any) => a.name.localeCompare(b.name)),
    [mapData],
  );

  useEffect(() => {
    for (const space of mapData.getByType("space")) {
      mapView.updateState(space, { color: "initial" });
    }
    if (!selectedLocation || selectedLocation.spaces.length === 0) return;
    setSearchQuery(selectedLocation.name);
    for (const space of selectedLocation.spaces) {
      mapView.updateState(space, { color: "#1890FF" });
    }
    if (
      !selectedLocation.spaces.some(
        (s: any) => s.floor === mapView.currentFloor,
      )
    ) {
      mapView.setFloor(selectedLocation.spaces[0].floor);
    }
    mapView.Camera.focusOn(selectedLocation.spaces, {
      maxZoomLevel: mapView.Camera.zoomLevel,
    });
  }, [selectedLocation]);

  const handleQueryChange = useCallback((query: string) => {
    setSearchQuery(query);
    if (query.length === 0) setSelectedLocation(null);
  }, []);

  const searchFn = useCallback(
    (query: string) =>
      mapData.Search.query(query).then((results: any) => [
        ...new Set(
          results.places
            .flatMap((p: any) =>
              "locationProfiles" in p.item ? p.item.locationProfiles : null,
            )
            .filter((x: any) => x != null)
            .filter((x: any) => x.spaces.length > 0),
        ),
      ]),
    [mapData],
  );

  const handleZoomIn = useCallback(
    () => mapView.Camera.animateTo({ zoomLevel: mapView.Camera.zoomLevel + 1 }),
    [mapView],
  );
  const handleZoomOut = useCallback(
    () => mapView.Camera.animateTo({ zoomLevel: mapView.Camera.zoomLevel - 1 }),
    [mapView],
  );

  return (
    <>
      <div
        style={{
          position: "absolute",
          width: 320,
          top: 20,
          left: 20,
          zIndex: 999,
        }}
      >
        <Search
          value={searchQuery}
          onChange={handleQueryChange}
          defaultResults={defaultResults}
          onLocationSelected={setSelectedLocation}
          searchFn={searchFn}
        />
      </div>

      <div style={{ position: "absolute", right: 20, top: 20, zIndex: 999 }}>
        <FloorSelector
          currentFloor={currentFloor}
          floors={mapData.getByType("floor")}
          onFloorSelected={handleFloorSelected}
        />
      </div>

      <div style={{ position: "absolute", right: 20, bottom: 20, zIndex: 999 }}>
        <ZoomControls onZoomIn={handleZoomIn} onZoomOut={handleZoomOut} />
      </div>
    </>
  );
}

function MapBridge({ setMapHandles }: { setMapHandles: (h: any) => void }) {
  const { mapData, mapView } = useMap();
  const [markers, setMarkers] = useState<any[]>([]);

  useEffect(() => {
    setMapHandles({ mapData, mapView });

    mapView.updateState(DOORS.Interior, {
      visible: true,
      color: "#5C4033",
      opacity: 0.6,
    });
    mapView.updateState(DOORS.Exterior, {
      visible: true,
      color: "black",
      opacity: 0.6,
    });

    mapData.getByType("space").forEach((space) => {
      mapView.updateState(space, { interactive: true, hoverColor: "#CCFFCC" });
    });

    const categoryConfig: Record<string, { color: string; icon: string }> = {
      Classroom: {
        color: "#4248ff",
        icon: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="white"><path d="M5 13.18v4L12 21l7-3.82v-4L12 17l-7-3.82zM12 3L1 9l11 6 9-4.91V17h2V9L12 3z"/></svg>`,
      },
      Office: {
        color: "#891244",
        icon: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="white"><path d="M20 6h-4V4c0-1.1-.9-2-2-2h-4c-1.1 0-2 .9-2 2v2H4c-1.1 0-2 .9-2 2v12c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V8c0-1.1-.9-2-2-2zm-8-2h4v2h-4V4z"/></svg>`,
      },
      Washroom: {
        color: "#219ED4",
        icon: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="white"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-1 14H9V8h2v8zm4 0h-2V8h2v8z"/></svg>`,
      },
      Cafeteria: {
        color: "#FF610A",
        icon: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="white"><path d="M18.06 22.99h1.66c.84 0 1.53-.64 1.63-1.46L23 5.05h-5V1h-1.97v4.05h-4.97l.3 2.34c1.71.47 3.31 1.32 4.27 2.26 1.44 1.42 2.43 2.89 2.43 5.29v8.05zM1 21.99V21h15.03v.99c0 .55-.45 1-1.01 1H2.01c-.56 0-1.01-.45-1.01-1zm15.03-7c0-4.5-6.72-5-8.99-5-2.28 0-9.01.5-9.01 5h18z"/></svg>`,
      },
      Library: {
        color: "#2E8B57",
        icon: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="white"><path d="M21 5c-1.11-.35-2.33-.5-3.5-.5-1.95 0-4.05.4-5.5 1.5-1.45-1.1-3.55-1.5-5.5-1.5S2.45 4.9 1 6v14.65c0 .25.25.5.5.5.1 0 .15-.05.25-.05C3.1 20.45 5.05 20 6.5 20c1.95 0 4.05.4 5.5 1.5 1.35-.85 3.8-1.5 5.5-1.5 1.65 0 3.35.3 4.75 1.05.1.05.15.05.25.05.25 0 .5-.25.5-.5V6c-.6-.45-1.25-.75-2-1z"/></svg>`,
      },
      Storage: {
        color: "#888888",
        icon: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="white"><path d="M20 6H4v2h16V6zm1-2H3c-.55 0-1 .45-1 1v3c0 .55.45 1 1 1h1v9c0 .55.45 1 1 1h14c.55 0 1-.45 1-1v-9h1c.55 0 1-.45 1-1V5c0-.55-.45-1-1-1zm-3 13H6v-8h12v8zm2-11H4V6h16v1z"/></svg>`,
      },
      Gymnasium: {
        color: "#FF610A",
        icon: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="white"><path d="M20.57 14.86L22 13.43 20.57 12 17 15.57 8.43 7 12 3.43 10.57 2 9.14 3.43 7.71 2 5.57 4.14 4.14 2.71 2.71 4.14l1.43 1.43L2 7.71l1.43 1.43L2 10.57 3.43 12 7 8.43 15.57 17 12 20.57 13.43 22l1.43-1.43L16.29 22l2.14-2.14 1.43 1.43 1.43-1.43-1.43-1.43L22 16.29z"/></svg>`,
      },
    };

    mapData.getByType("space").forEach((space) => {
      if (space.name) {
        const config = Object.entries(categoryConfig).find(([pattern]) =>
          space.name.startsWith(pattern),
        )?.[1] ?? { color: "#333333", icon: "" };

        mapView.Labels.add(space, space.name, {
          appearance: {
            color: config.color,
            icon: config.icon,
            iconSize: 20,
            iconFit: "contain",
            textColor: "#404040",
            textSize: 13,
          },
        });
      }
    });
  }, [mapData, mapView]);

  useMapViewEvent("click", (event: any) => {
    if (event.markers.length > 0) {
      setMarkers((prev: any[]) =>
        prev.filter((m) => m.id !== event.markers[0].target.id),
      );
    } else if (event.spaces.length > 0) {
      const space = event.spaces[0];
      const newMarker = {
        id: event.coordinate.id,
        coordinate: event.coordinate,
        text: space.name || "Unnamed Space",
      };
      setMarkers((prev: any[]) => [...prev, newMarker]);
    }
  });

  return (
    <>
      {markers.map((marker) => (
        <Marker
          key={marker.id}
          target={marker.coordinate}
          options={{ interactive: true, placement: "top" }}
        >
          <div
            style={{
              background: "#333333b5",
              color: "white",
              padding: "4px 8px",
              borderRadius: "6px",
              fontSize: "12px",
              whiteSpace: "nowrap",
            }}
          >
            📍{marker.text}
          </div>
        </Marker>
      ))}
    </>
  );
}
export default function App() {
  const { isLoading, error, mapData } = useMapData({
    key: "mik_yeBk0Vf0nNJtpesfu560e07e5",
    secret: "mis_2g9ST8ZcSFb5R9fPnsvYhrX3RyRwPtDGbMGweCYKEq385431022",
    mapId: "66686f1af06f04000b18b8fa",
  });

  const [mapHandles, setMapHandles] = useState<any>(null);

  if (isLoading)
    return (
      <div
        style={{
          width: "100vw",
          height: "100vh",
          background: "#fff",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          gap: "20px",
          fontFamily: "'Segoe UI', sans-serif",
        }}
      >
        <div style={{ display: "flex", gap: 8 }}>
          {[0, 1, 2].map((i) => (
            <div
              key={i}
              style={{
                width: 12,
                height: 12,
                background: "#86dd61",
                borderRadius: "50%",
                animation: `bounce 2.5s ease-in-out ${i * 0.2}s infinite`,
              }}
            />
          ))}
        </div>

        <p style={{ color: "#888", fontSize: 14, margin: 0, letterSpacing: 2 }}>
          XƏRİTƏ YÜKLƏNİR
        </p>

        <style>{`
      @keyframes bounce {
        0%, 100% { transform: translateY(0);    opacity: 0.4; }
        50%       { transform: translateY(-12px); opacity: 1;   }
      }
    `}</style>
      </div>
    );
  if (error) return <div>Xəta baş verdi: {error.message}</div>;
  if (!mapData) return <div>Data tapılmadı</div>;

  return (
    <div style={{ width: "100vw", height: "100vh", position: "relative" }}>
      <MapView mapData={mapData}>
        <MapBridge setMapHandles={setMapHandles} />
      </MapView>
      {mapHandles && (
        <MapUI mapView={mapHandles.mapView} mapData={mapHandles.mapData} />
      )}
    </div>
  );
}
