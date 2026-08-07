// The DTO is the type, not a second definition of the shape — it's inferred
// from the Zod schema in ../validation/, which is what actually validates the
// request. Keeping one definition is what stops the two from silently
// drifting apart.
export type { Create__ModuleName__Input as Create__ModuleName__Dto } from '../validation/__module_name__.schema';
