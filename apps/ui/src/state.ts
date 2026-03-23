import { specs as rawSpecs } from "virtual:herbrand-specs";
import { HerbrandStore } from "herbrand-signals";

export const store = new HerbrandStore();

// Feed the virtual module specs into the store
store.setSpecFiles(rawSpecs);
