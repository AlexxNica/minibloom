import * as Fnv from './fnv'


type ITypedArray = Uint8Array | Uint16Array | Uint32Array


export default class Filter {

  private numBits: number
  private buckets: Int32Array
  private locations: ITypedArray

  // Note that *m* is rounded up to the nearest multiple of
  // 32.  *k* specifies the number of hashing functions.
  constructor(numBits: number, private numHashes: number) {
    // Number of 32-bit words needed to store all the bits
    const nWords = Math.ceil(numBits / 32)

    // Number of bits rounded up to multiple of 32
    this.numBits = nWords * 32

    // Create a buffer for the data
    this.buckets = new Int32Array(nWords)

    // Create a buffer for the hash functions
    const kbytes = 1 << Math.ceil(Math.log(Math.ceil(Math.log(this.numBits) / Math.LN2 / 8)) / Math.LN2)

    const kbuffer = new ArrayBuffer(kbytes * numHashes)

    const arrayType = kbytes === 1 ? Uint8Array : kbytes === 2 ? Uint16Array : Uint32Array
    this.locations = new arrayType(kbuffer)
  }

  add(v: string) {
    const l = this.getLocations(v)
    const k = this.numHashes
    const buckets = this.buckets
    for (let i = 0; i < k; i++) {
      buckets[Math.floor(l[i] / 32)] |= 1 << (l[i] % 32)
    }
  }

  test(v: string) {
    const l = this.getLocations(v)
    const k = this.numHashes
    const buckets = this.buckets

    for (var i = 0; i < k; i++) {
      const b = l[i]
      if ((buckets[Math.floor(b / 32)] & (1 << (b % 32))) === 0) {
        return false
      }
    }

    return true
  }

  toBuffer(): Buffer {
    if (typeof Buffer == 'undefined') {
      throw new Error("Can only export a filter to a buffer in the node.js environment")
    }

    return new Buffer(this.buckets.buffer)
  }

  private getLocations(v: string) {
    const m = this.numBits
    const a = Fnv.hash(v)
    const b = Fnv.rehash(a)
    let x = a % m

    for (let i = 0; i < this.numHashes; i++) {
      this.locations[i] = x < 0 ? (x + m) : x
      x = (x + b) % m
    }

    return this.locations
  }

}