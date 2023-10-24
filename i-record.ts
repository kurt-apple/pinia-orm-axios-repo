import { Model } from 'pinia-orm'

export default interface iRecord extends Model {
  id: number | null
}
