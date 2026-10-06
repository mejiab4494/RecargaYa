import countriesData from "world-countries";

export const countries = countriesData
  .map((c) => ({ code: c.cca2, name: c.name.common }))
  .sort((a, b) => a.name.localeCompare(b.name));