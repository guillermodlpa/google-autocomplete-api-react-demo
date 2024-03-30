import React, { useRef, useState } from "react";
import { Loader } from "@googlemaps/js-api-loader";
import logo from "./logo.svg";
import "./App.css";

let placesApiClient: google.maps.PlacesLibrary | undefined;

async function getGoogleMapsPlacesApiClient(): Promise<google.maps.PlacesLibrary> {
  if (placesApiClient) {
    return placesApiClient;
  }
  const loader = new Loader({
    apiKey: process.env.REACT_APP_GOOGLE_MAPS_API_API_TOKEN || "",
    version: "weekly",
  });
  placesApiClient = await loader.importLibrary("places");
  return placesApiClient;
}

function App() {
  const [value, setValue] = useState("");
  const [fetchingPredictions, setFetchingPredictions] = useState(false);
  const [fetchingDetails, setFetchingDetails] = useState(false);
  const [suggestions, setSuggestions] = useState<any[]>([]);
  const [placeDetail, setPlaceDetail] = useState<any>();

  const sessionTokenRef = useRef<google.maps.places.AutocompleteSessionToken>();

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
      const places = await getGoogleMapsPlacesApiClient();

      if (!sessionTokenRef.current) {
        sessionTokenRef.current = new places.AutocompleteSessionToken();
      }

      setFetchingPredictions(true);
      // @see https://developers.google.com/maps/documentation/javascript/place-autocomplete
      new places.AutocompleteService().getPlacePredictions(
        {
          input: newValue,
          sessionToken: sessionTokenRef.current,
        },
        (predictions: any, status: any) => {
          console.log(predictions, status);
          setFetchingPredictions(false);
          if (status === places.PlacesServiceStatus.ZERO_RESULTS) {
            setSuggestions([]);
            return;
          }
          if (status !== places.PlacesServiceStatus.OK || !predictions) {
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

    const places = await getGoogleMapsPlacesApiClient();

    const sessionToken = sessionTokenRef.current;
    sessionTokenRef.current = undefined;

    setFetchingDetails(true);

    // @see https://developers.google.com/maps/documentation/javascript/places
    new places.PlacesService(
      document.getElementById(
        "googlemaps-attribution-container"
      ) as HTMLDivElement
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
        setFetchingDetails(false);
        if (status === places.PlacesServiceStatus.OK) {
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

        <h1 style={{ fontSize: "2rem", margin: "1rem 0" }}>
          Google Maps API Autocomplete demo
        </h1>

        <ul
          aria-label="Related links"
          style={{
            listStyleType: "none",
            display: "flex",
            flexWrap: "wrap",
            gap: "2rem",
            justifyContent: "center",
            margin: "0 0 2rem 0",
            padding: "0",
            textAlign: "center",
          }}
        >
          <li>
            <a
              href="https://github.com/guillermodlpa/google-autocomplete-api-react-demo"
              style={{ color: "inherit" }}
              target="_blank"
              rel="noreferrer noopener"
            >
              Source code
            </a>
          </li>

          <li>
            <a
              href="https://guillermodlpa.com"
              style={{ color: "inherit" }}
              target="_blank"
              rel="noreferrer noopener"
            >
              Author's site
            </a>
          </li>
        </ul>
      </header>

      <main style={{ maxWidth: "600px", margin: "0 auto" }}>
        <h2 style={{ fontSize: "1.25rem", textAlign: "left" }}>Description:</h2>

        <p>
          Using Google Clouds APIs <strong>Maps JavaScript API</strong> and{" "}
          <strong>Places API</strong>.
        </p>

        <ol>
          <li>
            A request is made to get autocomplete results when typing on the
            input.
          </li>
          <li>
            When a suggestion is selected, a request is made to obtain the place
            details.
          </li>
        </ol>

        <label style={{ fontSize: "1rem" }} htmlFor="location-input">
          Enter at least 4 characters to load suggestions:
        </label>

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

        {fetchingPredictions && <p>Fetching predictions...</p>}
        {fetchingDetails && <p>Fetching details...</p>}

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
