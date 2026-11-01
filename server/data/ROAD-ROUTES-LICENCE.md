# road-routes.json — source and licence

`road-routes.json` holds the road geometry for every transfer in the MediMatch demonstration
plan. It was computed with a self-hosted OSRM instance (car profile) on an OpenStreetMap extract
of Kenya from Geofabrik. Its `meta` block records the extract and its MD5, the simplification
tolerance and the build date. `src/tools/buildRoadRoutes.ts` rebuilds it.

It is a derivative of OpenStreetMap data and is made available under the
[Open Database Licence (ODbL) 1.0](https://opendatacommons.org/licenses/odbl/1-0/).

**Attribution:** © OpenStreetMap contributors — https://www.openstreetmap.org/copyright

The public OSRM demo server is not used. Its terms restrict it to non-commercial use without
guarantees, so routes are computed on infrastructure we run.
