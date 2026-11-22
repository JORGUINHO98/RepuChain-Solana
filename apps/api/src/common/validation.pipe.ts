import { BadRequestException, PipeTransform } from "@nestjs/common";
import type { ZodType } from "zod";
export class ZodPipe implements PipeTransform {
  constructor(private readonly schema: ZodType) {}
  transform(value: unknown) {
    const result = this.schema.safeParse(value);
    if (!result.success) throw new BadRequestException({ message: "Datos inválidos", errors: result.error.issues.map(i => ({ path: i.path.join("."), message: i.message })) });
    return result.data;
  }
}
