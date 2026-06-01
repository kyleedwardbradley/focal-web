import { describe, it, expect } from 'vitest';
import { jacobiEigen } from '../../src/core/eigen';
import type { Mat3 } from '../../src/core/MomentTensor';
import type { Vec3 } from '../../src/core/types';

const matVec = (m: Mat3, v: Vec3): Vec3 => [
  m[0] * v[0] + m[1] * v[1] + m[2] * v[2],
  m[3] * v[0] + m[4] * v[1] + m[5] * v[2],
  m[6] * v[0] + m[7] * v[1] + m[8] * v[2],
];
const len = (v: Vec3): number => Math.hypot(v[0], v[1], v[2]);
const dot = (a: Vec3, b: Vec3): number => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];

describe('jacobiEigen', () => {
  it('diagonalizes a diagonal matrix', () => {
    const { values } = jacobiEigen([3, 0, 0, 0, 2, 0, 0, 0, 1]);
    expect([...values].sort((a, b) => a - b)).toEqual([1, 2, 3]);
  });

  it('returns orthonormal eigenvectors that satisfy A·v = λ·v', () => {
    // A symmetric matrix with no special structure.
    const A: Mat3 = [2, -1, 0.5, -1, 3, 0.25, 0.5, 0.25, 1];
    const { values, vectors } = jacobiEigen(A);

    for (let i = 0; i < 3; i++) {
      const v = vectors[i]!;
      const lambda = values[i]!;
      expect(len(v)).toBeCloseTo(1, 10); // unit length
      const Av = matVec(A, v);
      for (let k = 0; k < 3; k++) {
        expect(Av[k]!).toBeCloseTo(lambda * v[k]!, 9); // eigenpair relation
      }
    }

    // mutual orthogonality
    expect(dot(vectors[0]!, vectors[1]!)).toBeCloseTo(0, 9);
    expect(dot(vectors[0]!, vectors[2]!)).toBeCloseTo(0, 9);
    expect(dot(vectors[1]!, vectors[2]!)).toBeCloseTo(0, 9);
  });

  it('preserves the trace (sum of eigenvalues)', () => {
    const A: Mat3 = [5, 2, -3, 2, -1, 4, -3, 4, 0.5];
    const { values } = jacobiEigen(A);
    expect(values[0] + values[1] + values[2]).toBeCloseTo(5 - 1 + 0.5, 9);
  });
});
