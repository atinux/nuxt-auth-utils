type Prettify<T> = {
  [K in keyof T]: T[K]
}

type RemoveIndexSignature<T> = {
  [K in keyof T as string extends K ? never : K]: T[K]
}

type GetIndexSignature<T> = {
  [K in keyof T as string extends K ? K : never]: T[K]
}

// Basic Omit but does not break if a [x:string]:unknown Index Signature is present in the type
export type OmitWithIndexSignature<T extends Record<string, unknown>, K extends keyof RemoveIndexSignature<T>> = Prettify<Omit<RemoveIndexSignature<T>, K> & GetIndexSignature<T>>
