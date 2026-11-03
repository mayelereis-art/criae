import { Suspense } from "react";
import { FormEntrar } from "../FormEntrar";

export const metadata = { title: "Entrar" };

export default function Entrar() {
  return (
    <Suspense>
      <FormEntrar />
    </Suspense>
  );
}
