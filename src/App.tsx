import {
  MapView,
  useMapData,
  useMap,
  Marker,
  useMapViewEvent,
} from "@mappedin/react-sdk";
import "./App.css";
import { Search, FloorSelector, ZoomControls } from "@mappedin/react-ui";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { Floor, LocationProfile, Space } from "@mappedin/mappedin-js";
import "@mappedin/react-ui/themes/mappedin-light.css";
import { DOORS } from "@mappedin/mappedin-js";
import booleanContains from "@turf/boolean-contains";
import { DynamicFocus } from "@mappedin/dynamic-focus";

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

type WayfindingMode = "idle" | "selectingStart" | "selectingEnd" | "navigating";

interface WayfindingPanelProps {
  mode: WayfindingMode;
  startSpace: Space | null;
  endSpace: Space | null;
  onStartClick: () => void;
  onEndClick: () => void;
  onClear: () => void;
  onDraw: () => void;
  isLoading: boolean;
  error: string | null;
}

function WayfindingPanel({
  mode,
  startSpace,
  endSpace,
  onStartClick,
  onEndClick,
  onClear,
  onDraw,
  isLoading,
  error,
}: WayfindingPanelProps) {
  const canDraw = startSpace && endSpace && mode !== "navigating";

  return (
    <div
      style={{
        background: "white",
        borderRadius: 14,
        boxShadow: "0 4px 20px rgba(0,0,0,0.15)",
        padding: "14px 16px",
        fontFamily: "'Segoe UI', sans-serif",
        minWidth: 280,
      }}
    >
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          marginBottom: 12,
        }}
      >
        <span style={{ fontWeight: 700, fontSize: 14, color: "#1a1a1a" }}>
          Yolunuz:
        </span>
        {(startSpace || endSpace || mode === "navigating") && (
          <button
            onClick={onClear}
            style={{
              background: "none",
              border: "none",
              cursor: "pointer",
              color: "#888",
              fontSize: 12,
              padding: "2px 6px",
              borderRadius: 6,
              transition: "all 0.15s",
            }}
            onMouseEnter={(e) =>
              ((e.target as HTMLButtonElement).style.background = "#f5f5f5")
            }
            onMouseLeave={(e) =>
              ((e.target as HTMLButtonElement).style.background = "none")
            }
          >
            Yolu təmizlə
          </button>
        )}
      </div>
      <SpaceSelector
        label="Başlanğıc məkan:"
        color="#1a7a4a"
        icon="🟢"
        space={startSpace}
        isSelecting={mode === "selectingStart"}
        onClick={onStartClick}
      />
      <div
        style={{
          textAlign: "center",
          fontSize: 16,
          color: "#aaa",
          margin: "4px 0",
        }}
      >
        ↓
      </div>
      <SpaceSelector
        label="Təyinat nöqtəsi:"
        color="#c0392b"
        icon="🔴"
        space={endSpace}
        isSelecting={mode === "selectingEnd"}
        onClick={onEndClick}
      />
      {mode !== "navigating" && (
        <button
          onClick={onDraw}
          disabled={!canDraw || isLoading}
          style={{
            marginTop: 10,
            width: "100%",
            padding: "10px",
            background: canDraw && !isLoading ? "#1571e8" : "#e0e0e0",
            color: canDraw && !isLoading ? "white" : "#aaa",
            border: "none",
            borderRadius: 8,
            fontWeight: 600,
            fontSize: 13,
            cursor: canDraw && !isLoading ? "pointer" : "not-allowed",
            transition: "all 0.2s",
          }}
        >
          {isLoading ? "Hesablanır..." : "Marşrutu Göstər"}
        </button>
      )}

      {mode === "navigating" && (
        <div
          style={{
            marginTop: 10,
            padding: "10px",
            background: "#e8f5e9",
            borderRadius: 8,
            fontSize: 12,
            color: "#2e7d32",
            fontWeight: 600,
            textAlign: "center",
          }}
        >
          Marşrut göstərilir
        </div>
      )}
      {(mode === "selectingStart" || mode === "selectingEnd") && (
        <div
          style={{
            marginTop: 8,
            padding: "8px 10px",
            background: "#fff8e1",
            borderRadius: 8,
            fontSize: 11,
            color: "#f57f17",
            fontWeight: 500,
            textAlign: "center",
          }}
        >
          {mode === "selectingStart"
            ? "Xəritədə başlanğıc otağı seçin"
            : "Xəritədə təyinat otağı seçin"}
        </div>
      )}
      {error && (
        <div
          style={{
            marginTop: 8,
            padding: "8px 10px",
            background: "#ffebee",
            borderRadius: 8,
            fontSize: 11,
            color: "#c62828",
            fontWeight: 500,
          }}
        >
          {error}
        </div>
      )}
    </div>
  );
}

function SpaceSelector({
  label,
  color,
  icon,
  space,
  isSelecting,
  onClick,
}: {
  label: string;
  color: string;
  icon: string;
  space: Space | null;
  isSelecting: boolean;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      style={{
        width: "100%",
        display: "flex",
        alignItems: "center",
        gap: 8,
        padding: "8px 10px",
        background: isSelecting ? "#e3f2fd" : "#f5f5f5",
        border: isSelecting ? `2px solid ${color}` : "2px solid transparent",
        borderRadius: 8,
        cursor: "pointer",
        textAlign: "left",
        transition: "all 0.15s",
      }}
    >
      <span style={{ fontSize: 14 }}>{icon}</span>
      <div style={{ flex: 1, overflow: "hidden" }}>
        <div style={{ fontSize: 10, color: "#888", fontWeight: 600 }}>
          {label}
        </div>
        <div
          style={{
            fontSize: 12,
            color: space ? "#1a1a1a" : "#bbb",
            fontWeight: space ? 600 : 400,
            whiteSpace: "nowrap",
            overflow: "hidden",
            textOverflow: "ellipsis",
          }}
        >
          {isSelecting
            ? "Xəritədən seçin..."
            : space
              ? space.name || "Adsız otaq"
              : "Seçilməyib"}
        </div>
      </div>
      {!isSelecting && <span style={{ fontSize: 10, color: "#aaa" }}>✎</span>}
    </button>
  );
}
function AppUI({
  mapView,
  mapData,
  buildingStatus,
  markers,
  wayfindingMode,
  wayfindingStart,
  wayfindingEnd,
  wayfindingLoading,
  wayfindingError,
  onWayfindingStartClick,
  onWayfindingEndClick,
  onWayfindingClear,
  onWayfindingDraw,
}: {
  mapView: any;
  mapData: any;
  buildingStatus: { inside: boolean; name?: string } | null;
  markers: any[];
  wayfindingMode: WayfindingMode;
  wayfindingStart: Space | null;
  wayfindingEnd: Space | null;
  wayfindingLoading: boolean;
  wayfindingError: string | null;
  onWayfindingStartClick: () => void;
  onWayfindingEndClick: () => void;
  onWayfindingClear: () => void;
  onWayfindingDraw: () => void;
}) {
  const [currentFloor, setCurrentFloor] = useState<Floor>(mapView.currentFloor);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedLocation, setSelectedLocation] =
    useState<LocationProfile | null>(null);
  const [multiFloorEnabled, setMultiFloorEnabled] = useState(false);

  useEffect(() => {
    const handleFloorChange = (payload: any) => setCurrentFloor(payload.floor);
    mapView.on("floor-change", handleFloorChange);
    return () => mapView.off("floor-change", handleFloorChange);
  }, [mapView]);

  const handleFloorSelected = useCallback(
    (floor: Floor) => {
      mapView.setFloor(floor);
      if (multiFloorEnabled) {
        const allFloors: Floor[] = mapData.getByType("floor");
        allFloors.forEach((f: any) => {
          const isActive = f.id === (floor as any).id;
          mapView.updateState(f, {
            visible: isActive,
            geometry: { visible: isActive, opacity: isActive ? 1.0 : 0.0 },
            images: { enabled: isActive },
            labels: { enabled: isActive },
            markers: { enabled: isActive },
            paths: { enabled: isActive },
          });
        });
      }
    },
    [mapView, mapData, multiFloorEnabled],
  );

  const handleMultiFloorToggle = useCallback(() => {
    const next = !multiFloorEnabled;
    setMultiFloorEnabled(next);
    const allFloors: Floor[] = mapData.getByType("floor");
    const DISTANCE = 10;

    if (next) {
      mapView.Camera.setPanMode("elevation");
      mapView.manualFloorVisibility = true;
      allFloors.forEach((floor: any) => {
        const isActive = floor.id === mapView.currentFloor.id;
        mapView.updateState(floor, {
          visible: true,
          altitude: 0,
          geometry: { visible: true, opacity: isActive ? 1.0 : 0.0 },
          images: { enabled: true },
          labels: { enabled: true },
          markers: { enabled: true },
          paths: { enabled: true },
        });
        mapView.animateState(
          floor,
          { altitude: floor.elevation * DISTANCE, geometry: { opacity: 1.0 } },
          { duration: 700, easing: "ease-in-out" },
        );
      });
    } else {
      mapView.Camera.setPanMode("default");
      mapView.manualFloorVisibility = false;
      allFloors.forEach((floor: any) => {
        const isActive = floor.id === mapView.currentFloor.id;
        mapView.animateState(
          floor,
          { altitude: 0, geometry: { opacity: isActive ? 1.0 : 0.0 } },
          { duration: 700, easing: "ease-in-out" },
        );
        setTimeout(() => {
          if (!isActive) {
            mapView.updateState(floor, {
              visible: false,
              altitude: 0,
              geometry: { visible: false, opacity: 0.0 },
              images: { enabled: false },
              labels: { enabled: false },
              markers: { enabled: false },
              paths: { enabled: false },
            });
          }
        }, 700);
      });
    }
  }, [multiFloorEnabled, mapData, mapView]);

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
      {/* Top-left: Search + building status */}
      <div
        style={{
          position: "absolute",
          width: 320,
          top: 20,
          left: 20,
          zIndex: 999,
          display: "flex",
          flexDirection: "column",
          gap: 10,
        }}
      >
        <Search
          value={searchQuery}
          onChange={handleQueryChange}
          defaultResults={defaultResults}
          onLocationSelected={setSelectedLocation}
          searchFn={searchFn}
        />
        {buildingStatus && (
          <div
            style={{
              background: buildingStatus.inside ? "#1a7a4a" : "#c0392b",
              color: "white",
              padding: "10px 20px",
              borderRadius: 10,
              fontSize: 14,
              fontWeight: 500,
              boxShadow: "0 2px 8px rgba(0,0,0,0.2)",
            }}
          >
            {buildingStatus.inside
              ? `${buildingStatus.name} binasının içindəsiniz`
              : "Seçdiyiniz koordinat binanın içərisində deyil."}
          </div>
        )}

        {/* Wayfinding panel — below the search bar */}
        <WayfindingPanel
          mode={wayfindingMode}
          startSpace={wayfindingStart}
          endSpace={wayfindingEnd}
          onStartClick={onWayfindingStartClick}
          onEndClick={onWayfindingEndClick}
          onClear={onWayfindingClear}
          onDraw={onWayfindingDraw}
          isLoading={wayfindingLoading}
          error={wayfindingError}
        />
      </div>

      {/* Top-right: Floor selector */}
      <div
        style={{
          position: "absolute",
          top: 20,
          right: 20,
          zIndex: 999,
          display: "flex",
          flexDirection: "column",
          alignItems: "flex-end",
          gap: 12,
        }}
      >
        <FloorSelector
          currentFloor={currentFloor}
          floors={mapData.getByType("floor")}
          onFloorSelected={handleFloorSelected}
        />
      </div>

      {/* Bottom-right: Zoom */}
      <div style={{ position: "absolute", right: 20, bottom: 20, zIndex: 999 }}>
        <ZoomControls onZoomIn={handleZoomIn} onZoomOut={handleZoomOut} />
      </div>

      {/* Bottom-left: Multi-floor toggle */}
      <div
        style={{
          position: "absolute",
          bottom: 13,
          left: 13,
          zIndex: 999,
          background: "white",
          borderRadius: 12,
          boxShadow: "0 2px 12px rgba(0,0,0,0.15)",
          padding: "12px 16px",
          fontFamily: "'Segoe UI', sans-serif",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <span style={{ fontSize: 13, fontWeight: 600, color: "#333" }}>
            Çoxmərtəbəli Görünüş Rejmi
          </span>
          <button
            onClick={handleMultiFloorToggle}
            style={{
              background: multiFloorEnabled ? "#058005" : "#e0e0e0",
              color: multiFloorEnabled ? "white" : "#555",
              border: "none",
              borderRadius: 5,
              padding: "4px 12px",
              fontSize: 12,
              cursor: "pointer",
              fontWeight: 600,
              transition: "all 0.2s",
            }}
          >
            {multiFloorEnabled ? "Aktivdir" : "Aktivləşdir"}
          </button>
        </div>
      </div>

      {/* Markers */}
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

function MapBridge({
  onReady,
  onBuildingStatus,
  setMarkers,
  wayfindingMode,
  onSpaceClickedForWayfinding,
}: {
  onReady: (handles: { mapData: any; mapView: any }) => void;
  onBuildingStatus: (status: { inside: boolean; name?: string } | null) => void;
  setMarkers: React.Dispatch<React.SetStateAction<any[]>>;
  wayfindingMode: WayfindingMode;
  onSpaceClickedForWayfinding: (space: Space) => void;
}) {
  const { mapData, mapView } = useMap();
  const readyRef = useRef(false);
  const modeRef = useRef(wayfindingMode);
  useEffect(() => {
    modeRef.current = wayfindingMode;
  }, [wayfindingMode]);

  useEffect(() => {
    if (readyRef.current) return;
    readyRef.current = true;

    onReady({ mapData, mapView });

    mapView.__EXPERIMENTAL__auto();

    const df = new DynamicFocus(mapView);
    df.enable({ autoFocus: true, setFloorOnFocus: true });

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

    const timer = setTimeout(() => {
      mapData.getByType("space").forEach((space: any) => {
        mapView.updateState(space, {
          interactive: true,
          hoverColor: "#CCFFCC",
        });
      });
      mapData.getByType("space").forEach((space: any) => {
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
    }, 500);

    return () => {
      clearTimeout(timer);
      df.destroy();
    };
  }, [mapData, mapView]);

  useMapViewEvent("click", (event: any) => {
    const mode = modeRef.current;

    if (
      (mode === "selectingStart" || mode === "selectingEnd") &&
      event?.spaces?.length > 0
    ) {
      onSpaceClickedForWayfinding(event.spaces[0]);
      return;
    }

    const buildings = mapData
      .getByType("floor-stack")
      .filter((fs: any) => fs.type === "Building");

    let found = false;
    buildings.forEach((building: any) => {
      if (booleanContains(building.geoJSON, event.coordinate.geoJSON)) {
        onBuildingStatus({ inside: true, name: building.name });
        found = true;
      }
    });
    if (!found) onBuildingStatus({ inside: false });

    if (mode === "idle" || mode === "navigating") {
      if (event.markers.length > 0) {
        setMarkers((prev) =>
          prev.filter((m) => m.id !== event.markers[0].target.id),
        );
      } else if (event.spaces.length > 0) {
        const space = event.spaces[0];
        setMarkers((prev) => [
          ...prev,
          {
            id: event.coordinate.id,
            coordinate: event.coordinate,
            text: space.name || "Unnamed Space",
          },
        ]);
      }
    }
  });

  return null;
}

export default function App() {
  const { isLoading, error, mapData } = useMapData({
    key: "mik_yeBk0Vf0nNJtpesfu560e07e5",
    secret: "mis_2g9ST8ZcSFb5R9fPnsvYhrX3RyRwPtDGbMGweCYKEq385431022",
    mapId: "66686f1af06f04000b18b8fa",
  });

  const [mapHandles, setMapHandles] = useState<{
    mapData: any;
    mapView: any;
  } | null>(null);
  const [buildingStatus, setBuildingStatus] = useState<{
    inside: boolean;
    name?: string;
  } | null>(null);
  const [markers, setMarkers] = useState<any[]>([]);

  const [wayfindingMode, setWayfindingMode] = useState<WayfindingMode>("idle");
  const [wayfindingStart, setWayfindingStart] = useState<Space | null>(null);
  const [wayfindingEnd, setWayfindingEnd] = useState<Space | null>(null);
  const [wayfindingLoading, setWayfindingLoading] = useState(false);
  const [wayfindingError, setWayfindingError] = useState<string | null>(null);

  const handleWayfindingStartClick = useCallback(() => {
    setWayfindingMode((prev) =>
      prev === "selectingStart" ? "idle" : "selectingStart",
    );
  }, []);

  const handleWayfindingEndClick = useCallback(() => {
    setWayfindingMode((prev) =>
      prev === "selectingEnd" ? "idle" : "selectingEnd",
    );
  }, []);

  const handleWayfindingClear = useCallback(() => {
    setWayfindingStart(null);
    setWayfindingEnd(null);
    setWayfindingMode("idle");
    setWayfindingError(null);
    if (mapHandles) {
      mapHandles.mapView.Navigation.clear();
    }
  }, [mapHandles]);

  const handleSpaceClickedForWayfinding = useCallback(
    (space: Space) => {
      if (wayfindingMode === "selectingStart") {
        setWayfindingStart(space);
        setWayfindingMode("idle");
        if (mapHandles) {
          mapHandles.mapView.updateState(space, { color: "#4caf50" });
        }
      } else if (wayfindingMode === "selectingEnd") {
        setWayfindingEnd(space);
        setWayfindingMode("idle");
        if (mapHandles) {
          mapHandles.mapView.updateState(space, { color: "#f44336" });
        }
      }
    },
    [wayfindingMode, mapHandles],
  );

  const handleWayfindingDraw = useCallback(async () => {
    if (!mapHandles || !wayfindingStart || !wayfindingEnd) return;
    setWayfindingLoading(true);
    setWayfindingError(null);

    try {
      const directions = await mapHandles.mapData.getDirections(
        wayfindingStart,
        wayfindingEnd,
      );

      if (!directions) {
        setWayfindingError("Bu iki nöqtə arasında marşrut tapılmadı.");
        setWayfindingLoading(false);
        return;
      }

      mapHandles.mapView.Navigation.clear();
      mapHandles.mapData.getByType("space").forEach((s: any) => {
        mapHandles.mapView.updateState(s, { color: "initial" });
      });

      mapHandles.mapView.updateState(wayfindingStart, { color: "#4caf50" });
      mapHandles.mapView.updateState(wayfindingEnd, { color: "#f44336" });

      mapHandles.mapView.Navigation.draw(directions);

      setWayfindingMode("navigating");
    } catch (err: any) {
      setWayfindingError(
        err?.message ?? "Marşrut hesablanarkən xəta baş verdi.",
      );
    } finally {
      setWayfindingLoading(false);
    }
  }, [mapHandles, wayfindingStart, wayfindingEnd]);

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
                animation: `bounce 2s ease-in-out ${i * 0.2}s infinite`,
              }}
            />
          ))}
        </div>
        <p style={{ color: "#888", fontSize: 14, margin: 0, letterSpacing: 2 }}>
          XƏRİTƏ YÜKLƏNİR
        </p>
        <style>{`
          @keyframes bounce {
            0%, 100% { transform: translateY(0);     opacity: 0.4; }
            50%       { transform: translateY(-12px); opacity: 1;   }
          }
        `}</style>
      </div>
    );

  if (error) return <div>Xəta baş verdi: {error.message}</div>;
  if (!mapData) return <div>Data tapılmadı</div>;

  return (
    <div style={{ width: "100vw", height: "100vh", position: "relative" }}>
      <MapView
        mapData={mapData}
        options={{
          multiFloorView: {
            enabled: false,
            floorGap: 10,
            updateCameraElevationOnFloorChange: true,
          },
        }}
      >
        <MapBridge
          onReady={setMapHandles}
          onBuildingStatus={setBuildingStatus}
          setMarkers={setMarkers}
          wayfindingMode={wayfindingMode}
          onSpaceClickedForWayfinding={handleSpaceClickedForWayfinding}
        />

        {mapHandles && (
          <AppUI
            mapView={mapHandles.mapView}
            mapData={mapHandles.mapData}
            buildingStatus={buildingStatus}
            markers={markers}
            wayfindingMode={wayfindingMode}
            wayfindingStart={wayfindingStart}
            wayfindingEnd={wayfindingEnd}
            wayfindingLoading={wayfindingLoading}
            wayfindingError={wayfindingError}
            onWayfindingStartClick={handleWayfindingStartClick}
            onWayfindingEndClick={handleWayfindingEndClick}
            onWayfindingClear={handleWayfindingClear}
            onWayfindingDraw={handleWayfindingDraw}
          />
        )}
      </MapView>
    </div>
  );
}
