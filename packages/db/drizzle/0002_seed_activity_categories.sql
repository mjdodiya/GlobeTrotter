INSERT INTO "activity_categories" ("name")
VALUES
	('Sightseeing'),
	('Food'),
	('Adventure'),
	('Museum'),
	('Nature'),
	('Shopping'),
	('Entertainment')
ON CONFLICT ("name") DO NOTHING;
