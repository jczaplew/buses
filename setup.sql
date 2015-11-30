DROP DATABASE IF EXISTS msnbus;

CREATE DATABASE msnbus;
\connect msnbus;
CREATE EXTENSION postgis;
CREATE EXTENSION pg_trgm;

CREATE TABLE routes_scraped (
  route_id varchar(5),
  geom geometry
);

CREATE INDEX on routes_scraped (route_id);
CREATE INDEX on routes_scraped USING Gist (geom);

CREATE TABLE directions (
  direction_id integer,
  name varchar(150)
);

CREATE INDEX ON directions (direction_id);

CREATE TABLE stops_scraped (
  stop_id integer,
  gtfs_id varchar(5),
  name varchar(150),
  alt_name varchar(150),
  direction varchar(5),
  geom geometry
);

CREATE INDEX ON stops_scraped (stop_id);
CREATE INDEX ON stops_scraped (gtfs_id);
CREATE INDEX ON stops_scraped USING gist (geom);

CREATE TABLE route_stop_directions (
  route_id varchar(5),
  direction_id integer,
  stop_id integer
);

CREATE INDEX ON route_stop_directions (route_id);
CREATE INDEX ON route_stop_directions (direction_id);
CREATE INDEX ON route_stop_directions (stop_id);
