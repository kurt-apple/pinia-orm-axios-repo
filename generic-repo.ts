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

// T can implement iCreateT but what really matters is iCreateT should be what that API expects
export default class CustomRepo<iCreateT, T extends iRecord> extends Repository<T> implements SimpleApiBackedRepo {
  loaded = false
  apidir = ''

  commonHeader = () => {
    const auth = useAuthenticationStore()
    return { headers: auth.bearerToken }
  }

  highestID = () => {
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
    return await api.delete(`/${this.apidir}/${id}`)
  }

  update = async (newItemValue: T) => {
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
