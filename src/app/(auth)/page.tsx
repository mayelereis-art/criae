import { Suspense } from "react";
import { FormEntrar } from "./FormEntrar";

export default function Inicio() {
  return (
    <Suspense>
      <FormEntrar />
    </Suspense>
  );
}
