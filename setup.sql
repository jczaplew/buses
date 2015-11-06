
CREATE DATABASE msnbus;
\connect msnbus;
CREATE EXTENSION postgis;

CREATE TABLE routes (
  route_id varchar(5),
  geom geometry
);

CREATE INDEX on routes (route_id);

CREATE TABLE directions (
  direction_id integer,
  name varchar(150)
);

CREATE INDEX ON directions (direction_id);

CREATE TABLE stops (
  stop_id integer,
  gtfs_id varchar(5),
  name varchar(150),
  alt_name varchar(150),
  direction varchar(5),
  geom geometry
);

CREATE INDEX ON stops (stop_id);
CREATE INDEX ON stops (gtfs_id);

CREATE TABLE route_stop_directions (
  route_id varchar(5),
  direction_id integer,
  stop_id integer
);

CREATE INDEX ON route_stop_directions (route_id);
CREATE INDEX ON route_stop_directions (direction_id);
CREATE INDEX ON route_stop_directions (stop_id);
