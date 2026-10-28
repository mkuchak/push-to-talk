import { describe, it, expect } from 'vitest'

import { encodeWav } from '../../src/shared/wav'

describe('encodeWav', () => {
  it('writes a 16 kHz mono 16-bit PCM header', () => {
    const wav = encodeWav(new Float32Array(16000), 16000)
    const view = new DataView(wav.buffer)
    const ascii = (offset: number) =>
      String.fromCharCode(...wav.slice(offset, offset + 4))

    expect(wav.byteLength).toBe(44 + 32000)
    expect(ascii(0)).toBe('RIFF')
    expect(view.getUint32(4, true)).toBe(36 + 32000)
    expect(ascii(8)).toBe('WAVE')
    expect(view.getUint16(20, true)).toBe(1)
    expect(view.getUint16(22, true)).toBe(1)
    expect(view.getUint32(24, true)).toBe(16000)
    expect(view.getUint16(34, true)).toBe(16)
    expect(ascii(36)).toBe('data')
    expect(view.getUint32(40, true)).toBe(32000)
  })

  it('clamps and scales samples to int16', () => {
    const wav = encodeWav(new Float32Array([0, 1, -1, 2, -2, 0.5]), 16000)
    const view = new DataView(wav.buffer)
    const sample = (i: number) => view.getInt16(44 + i * 2, true)

    expect(sample(0)).toBe(0)
    expect(sample(1)).toBe(32767)
    expect(sample(2)).toBe(-32768)
    expect(sample(3)).toBe(32767)
    expect(sample(4)).toBe(-32768)
    expect(sample(5)).toBe(16383)
  })
})
