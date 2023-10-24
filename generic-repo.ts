import { Repository } from 'pinia-orm'
import { api } from 'src/boot/axios'
import iRecord from './i-record'
import { useAuthenticationStore } from '../authentication/pinia-authentication'

interface SimpleApiBackedRepo {
  // requiring this because UI tries to update before async function is even done.
  // TODO: there might be a way to properly await onDialogOK in particular (perhaps by making the q.dialog async)
  loaded: boolean
  // TODO: access T.entity somehow. In the meantime just have a string property.
  apidir: string
}

// iCreateT is basically the model's mandatory fields minus id since a new object won't be assigned an ID yet.
// T can implement iCreateT but what really matters is iCreateT should be what that API expects
// todo: support optional UUID client-side id generation
export default class CustomRepo<iCreateT, T extends iRecord> extends Repository<T> implements SimpleApiBackedRepo {
  loaded = false
  apidir = ''

  // todo: use DI perhaps, to specify the shape of a headers provider
  // todo: handle null/undefined commonHeader in case of none required
  // todo: place common header in all calls
  commonHeader = () => {
    const auth = useAuthenticationStore()
    return { headers: auth.bearerToken }
  }

  highestID = () => {
  	// todo: it would be nice if id wasn't always nullable. Perhaps Model could make id not-null
    return this.all().reduce((max, x) => (x.id ?? 0) > (max.id ?? 0) ? x : max)
  }

  fetch = async () => {
    this.loaded = false
    const response = await api.get(`/${this.apidir}`)
    console.log(response.data as T[])
    this.fresh(response.data as T[])
    this.loaded = true
    return response
  }

  add = async (newItem: iCreateT) => {
    console.debug('add item: ', { newItem })
    const response = await api.post(`/${this.apidir}`, newItem)
    console.debug('response: ', response)
    this.save(response.data)
  }

  delete = async (id: number) => {
  	// todo: debug, info, and error handling
    return await api.delete(`/${this.apidir}/${id}`)
  }

  update = async (newItemValue: T) => {
  	// todo: debug, info, and error handling
    return await api.patch(`/${this.apidir}/${newItemValue.id}`)
  }

  // includeEntity: name of entity to include. * invokes withAll. ** invokes withAllRecursive.
  // todo: test if this sorts the store in-place
  sorted = (sort: (a: T, b: T) => number, includeEntity?: string) => {
    if (typeof includeEntity === 'undefined') return this.all().sort(sort)
    if (includeEntity === '**') return this.withAllRecursive().get().sort(sort)
    if (includeEntity === '*') return this.withAll().get().sort(sort)
    return this.with(includeEntity).get().sort(sort)
  }
}
