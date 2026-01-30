// components/ui/button.tsx
"use client";

import { Button as NextUIButton, ButtonProps } from "@nextui-org/react";

export function Button(props: ButtonProps) {
  return <NextUIButton {...props} />;
}