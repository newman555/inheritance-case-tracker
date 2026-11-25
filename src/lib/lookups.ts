import { db } from '@/lib/db'

// マスタデータの1行：保存するコードと、画面に表示する名前。
export type Lookup = { code: string; label: string }

export type Lookups = { propertyTypes: Lookup[]; partnerTypes: Lookup[]; relationships: Lookup[] }

// プルダウン用のマスタデータ（PropertyType・PartnerType・RelationshipType テーブル）を表示順で返す。
// GET /api/lookups とプルダウンのある画面で使う。
export async function getLookups(): Promise<Lookups> {
  const orderBy = { sortOrder: 'asc' } as const
  const select = { code: true, label: true } as const
  const [propertyTypes, partnerTypes, relationships] = await Promise.all([
    db.propertyType.findMany({ orderBy, select }),
    db.partnerType.findMany({ orderBy, select }),
    db.relationshipType.findMany({ orderBy, select }),
  ])
  return { propertyTypes, partnerTypes, relationships }
}
