import { specs as rawSpecs } from "virtual:herbrand-specs";
import { HerbrandStore } from "@herbrand/signals";

export const store = new HerbrandStore();

// Feed the virtual module specs into the store
store.setSpecFiles(rawSpecs);

// Accept live spec updates from the vite plugin's file watcher
if (import.meta.hot) {
  import.meta.hot.on("herbrand:specs-update", (newSpecs) => {
    store.setSpecFiles(newSpecs);
  });
}
