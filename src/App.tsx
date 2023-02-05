import React, { useRef, useState } from "react";
import { Loader } from "@googlemaps/js-api-loader";
import logo from "./logo.svg";
import "./App.css";

type PlacesServiceStatus =
  | "INVALID_REQUEST"
  | "NOT_FOUND"
  | "OK"
  | "OVER_QUERY_LIMIT"
  | "REQUEST_DENIED"
  | "UNKNOWN_ERROR"
  | "ZERO_RESULTS";

export type Prediction = {
  description: string;
  place_id: string;
};

export type PlaceDetail = {
  // fields here depend on the fields param passed to getDetails
  formatted_address?: string;
  geometry?: {
    location: { lat: () => number; lng: () => number };
  };
  name?: string;
  place_id?: string;
};

type GoogleApiClient = {
  maps: {
    places: {
      AutocompleteSessionToken: { new (): string };
      AutocompleteService: {
        new (): {
          getPlacePredictions: (
            params: { input: string; sessionToken: string | undefined },
            callback: (
              predictions: Prediction[],
              status: PlacesServiceStatus
            ) => void
          ) => void;
        };
      };
      PlacesService: {
        new (attributionNode: HTMLElement): {
          getDetails: (
            params: {
              placeId: string;
              fields?: string[];
              sessionToken: string | undefined;
            },
            callback: (place: PlaceDetail, status: PlacesServiceStatus) => void
          ) => void;
        };
      };
      PlacesServiceStatus: {
        [key in PlacesServiceStatus]: PlacesServiceStatus;
      };
    };
    [key: string]: any;
  };
};

let googleApiClient: GoogleApiClient | undefined;

async function getGoogleMapsApiClient(): Promise<GoogleApiClient> {
  if (googleApiClient) {
    return googleApiClient;
  }
  const loader = new Loader({
    apiKey: process.env.REACT_APP_GOOGLE_MAPS_API_API_TOKEN || "",
    version: "weekly",
    libraries: ["places"],
  });
  googleApiClient = (await loader.load()) as GoogleApiClient;
  return googleApiClient;
}

function App() {
  const [value, setValue] = useState("");
  const [suggestions, setSuggestions] = useState<any[]>([]);
  const [placeDetail, setPlaceDetail] = useState<any>();

  const sessionTokenRef = useRef<string>();

  const timeoutRef = useRef<NodeJS.Timeout>();
  const handleChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = event.target.value;
    setValue(newValue);

    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }

    if (!newValue || newValue.trim().length <= 3) {
      setSuggestions([]);
      return;
    }

    timeoutRef.current = setTimeout(async () => {
      const google = await getGoogleMapsApiClient();

      if (!sessionTokenRef.current) {
        sessionTokenRef.current =
          new google.maps.places.AutocompleteSessionToken();
      }

      // @see https://developers.google.com/maps/documentation/javascript/place-autocomplete
      new google.maps.places.AutocompleteService().getPlacePredictions(
        {
          input: newValue,
          sessionToken: sessionTokenRef.current,
        },
        (predictions: any, status: any) => {
          console.log(predictions, status);
          if (status === google.maps.places.PlacesServiceStatus.ZERO_RESULTS) {
            setSuggestions([]);
            return;
          }
          if (
            status !== google.maps.places.PlacesServiceStatus.OK ||
            !predictions
          ) {
            alert(status);
            return;
          }
          setSuggestions(predictions);
        }
      );
    }, 350);
  };

  const handleSuggestionSelected = async (suggestion: any) => {
    setValue(suggestion.description);
    setSuggestions([]);

    const google = await getGoogleMapsApiClient();

    const sessionToken = sessionTokenRef.current;
    sessionTokenRef.current = undefined;

    // @see https://developers.google.com/maps/documentation/javascript/places
    new google.maps.places.PlacesService(
      document.getElementById("googlemaps-attribution-container")!
    ).getDetails(
      {
        placeId: suggestion.place_id,
        fields: [
          // @see https://developers.google.com/maps/documentation/javascript/place-data-fields
          "formatted_address",
          "name",
          "place_id",
          "geometry.location",
        ],
        sessionToken,
      },
      (place: any, status: any) => {
        if (status === google.maps.places.PlacesServiceStatus.OK) {
          setPlaceDetail(place);
        }
      }
    );
  };

  return (
    <div
      className="App"
      style={{
        backgroundColor: "#282c34",
        minHeight: "100dvh",
        color: "white",
        padding: "5vh 2rem",
        width: "100%",
      }}
    >
      <header style={{ textAlign: "center" }}>
        <img src={logo} className="App-logo" alt="logo" />

        <h1 style={{ fontSize: "2rem" }}>Google Maps API Autocomplete demo</h1>
      </header>

      <main style={{ maxWidth: "600px", margin: "0 auto" }}>
        <h2 style={{ fontSize: "1.25rem", textAlign: "left" }}>Description:</h2>

        <ul>
          <li>
            Using Google Clouds APIs <strong>Maps JavaScript API</strong> and{" "}
            <strong>Places API</strong>
          </li>
          <li>
            First, a request is made to get autocomplete results when typing on
            the input
          </li>
          <li>
            Second, when a suggestion is selected, a request is made to obtain
            the place details
          </li>
        </ul>

        <p style={{ fontSize: "1rem" }}>
          Enter at least 4 characters to load suggestions
        </p>

        <input
          id="location-input"
          style={{
            fontSize: "1.25rem",
            width: "100%",
            maxWidth: "100%",
            padding: "0.5rem",
          }}
          placeholder="Enter an address or a place name"
          onChange={handleChange}
          value={value}
        />

        {suggestions.length > 0 && (
          <div>
            <h2 style={{ fontSize: "1.5rem", textAlign: "left" }}>
              Suggestions:
            </h2>
            <ul style={{ listStyleType: "none", padding: "0" }} role="listbox">
              {suggestions.map((suggestion) => (
                <li
                  key={suggestion.place_id}
                  style={{
                    fontSize: "1rem",
                    padding: "0.25rem 0.5rem",
                    margin: "0.25rem 0",
                    backgroundColor: "rgba(255, 255, 255, 0.15)",
                    cursor: "pointer",
                  }}
                  tabIndex={-1}
                  role="option"
                  aria-selected="false"
                  onClick={() => handleSuggestionSelected(suggestion)}
                >
                  {suggestion.description}
                </li>
              ))}
            </ul>
          </div>
        )}

        {placeDetail && (
          <div>
            <h2 style={{ fontSize: "1.5rem", textAlign: "left" }}>
              Place detail:
            </h2>
            <pre
              style={{
                fontSize: "0.85rem",
                textAlign: "left",
                whiteSpace: "pre-wrap",
              }}
            >
              {JSON.stringify(placeDetail, null, 2)}
            </pre>
          </div>
        )}

        <div id="googlemaps-attribution-container"></div>
      </main>
    </div>
  );
}

export default App;
