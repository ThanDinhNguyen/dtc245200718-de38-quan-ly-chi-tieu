CREATE TABLE IF NOT EXISTS admins (
 id integer GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
 username varchar(40) NOT NULL UNIQUE,password_hash text NOT NULL,
 auth_version integer NOT NULL DEFAULT 1
);
CREATE TABLE IF NOT EXISTS sessions(sid varchar PRIMARY KEY,sess json NOT NULL,expire timestamp(6) NOT NULL);
CREATE INDEX IF NOT EXISTS sessions_expire_idx ON sessions(expire);
CREATE TABLE IF NOT EXISTS categories(
 id integer GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
 name varchar(80) NOT NULL CHECK(length(trim(name))>0),
 type varchar(7) NOT NULL CHECK(type IN ('income','expense')),
 version integer NOT NULL DEFAULT 1,
 UNIQUE(id,type)
);
CREATE UNIQUE INDEX IF NOT EXISTS category_name_type_unique ON categories(type,lower(name));
CREATE TABLE IF NOT EXISTS transactions(
 id integer GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
 type varchar(7) NOT NULL CHECK(type IN ('income','expense')),
 category_id integer NOT NULL,
 amount_vnd numeric(15,0) NOT NULL CHECK(amount_vnd BETWEEN 1 AND 999999999999999),
 occurred_on date NOT NULL,
 note varchar(400) NOT NULL DEFAULT '',
 version integer NOT NULL DEFAULT 1,
 created_at timestamptz NOT NULL DEFAULT now(),
 updated_at timestamptz NOT NULL DEFAULT now(),
 FOREIGN KEY(category_id,type) REFERENCES categories(id,type) ON DELETE RESTRICT ON UPDATE RESTRICT
);
CREATE INDEX IF NOT EXISTS transactions_date_idx ON transactions(occurred_on DESC,id DESC);
CREATE INDEX IF NOT EXISTS transactions_category_date_idx ON transactions(category_id,occurred_on);
CREATE TABLE IF NOT EXISTS seed_versions(version integer PRIMARY KEY,applied_at timestamptz NOT NULL DEFAULT now());
