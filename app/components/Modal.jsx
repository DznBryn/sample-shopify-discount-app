// @ts-nocheck
import React from 'react'

export default function Modal({ id = 'my-modal', size = 'base', children}) {
  return <ui-modal id={id} variant={size}>
    {children}
  </ui-modal>
}
