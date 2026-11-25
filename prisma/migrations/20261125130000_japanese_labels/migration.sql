-- マスタデータの表示名を日本語にする。コード（他のテーブルが保存する値）は変えない。

UPDATE "PropertyType" SET "label" = '戸建て' WHERE "code" = 'house';
UPDATE "PropertyType" SET "label" = '区分マンション' WHERE "code" = 'condo_unit';
UPDATE "PropertyType" SET "label" = '土地' WHERE "code" = 'land';
UPDATE "PropertyType" SET "label" = '一棟アパート・マンション' WHERE "code" = 'whole_building';
UPDATE "PropertyType" SET "label" = '事業用' WHERE "code" = 'commercial';
UPDATE "PropertyType" SET "label" = 'その他' WHERE "code" = 'other';

UPDATE "PartnerType" SET "label" = '税理士' WHERE "code" = 'tax_accountant';
UPDATE "PartnerType" SET "label" = '司法書士' WHERE "code" = 'judicial_scrivener';
UPDATE "PartnerType" SET "label" = '弁護士' WHERE "code" = 'lawyer';

UPDATE "RelationshipType" SET "label" = '配偶者' WHERE "code" = 'spouse';
UPDATE "RelationshipType" SET "label" = '息子' WHERE "code" = 'son';
UPDATE "RelationshipType" SET "label" = '娘' WHERE "code" = 'daughter';
UPDATE "RelationshipType" SET "label" = '父' WHERE "code" = 'father';
UPDATE "RelationshipType" SET "label" = '母' WHERE "code" = 'mother';
UPDATE "RelationshipType" SET "label" = '兄弟' WHERE "code" = 'brother';
UPDATE "RelationshipType" SET "label" = '姉妹' WHERE "code" = 'sister';
UPDATE "RelationshipType" SET "label" = '孫' WHERE "code" = 'grandchild';
UPDATE "RelationshipType" SET "label" = '甥・姪' WHERE "code" = 'nephew_niece';
UPDATE "RelationshipType" SET "label" = 'その他' WHERE "code" = 'other';
