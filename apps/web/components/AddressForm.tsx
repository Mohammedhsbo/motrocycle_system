"use client";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { createAddressSchema, updateAddressSchema, type CreateAddressDto, type UpdateAddressDto } from "@motorcycle-system/shared-types";
import { Input } from "./Input";
import { Button } from "./Button";
import { useTranslations } from "next-intl";

type AddressFormProps =
  | {
      mode: "create";
      initialData?: never;
      onSubmit: (data: CreateAddressDto) => Promise<void>;
      onCancel?: () => void;
      isLoading?: boolean;
    }
  | {
      mode: "edit";
      initialData?: UpdateAddressDto;
      onSubmit: (data: UpdateAddressDto) => Promise<void>;
      onCancel?: () => void;
      isLoading?: boolean;
    };

export function AddressForm({ mode, initialData, onSubmit, onCancel, isLoading }: AddressFormProps) {
  const t = useTranslations("customer.addressForm");
  const tCommon = useTranslations("common");

  const schema = mode === "create" ? createAddressSchema : updateAddressSchema;

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<CreateAddressDto | UpdateAddressDto>({
    resolver: zodResolver(schema),
    defaultValues: initialData || {
      label: "Home",
      addressLine: "",
      city: "",
      region: "",
      postalCode: "",
      country: "Saudi Arabia",
      isDefault: false,
      notes: "",
    },
  });

  const handleFormSubmit = async (data: CreateAddressDto | UpdateAddressDto) => {
    if (mode === "create") {
      await onSubmit(data as CreateAddressDto);
    } else {
      await onSubmit(data as UpdateAddressDto);
    }
  };

  return (
    <form onSubmit={handleSubmit(handleFormSubmit)} className="space-y-4">
      <Input
        {...register("label")}
        label={t("label")}
        placeholder={t("labelPlaceholder")}
        error={errors.label?.message}
      />

      <Input
        {...register("addressLine")}
        label={t("addressLine")}
        placeholder={t("addressLinePlaceholder")}
        error={errors.addressLine?.message}
        required
      />

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Input
          {...register("city")}
          label={t("city")}
          placeholder={t("cityPlaceholder")}
          error={errors.city?.message}
        />

        <Input
          {...register("region")}
          label={t("region")}
          placeholder={t("regionPlaceholder")}
          error={errors.region?.message}
        />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Input
          {...register("postalCode")}
          label={t("postalCode")}
          placeholder={t("postalCodePlaceholder")}
          error={errors.postalCode?.message}
        />

        <Input
          {...register("country")}
          label={t("country")}
          placeholder={t("countryPlaceholder")}
          error={errors.country?.message}
        />
      </div>

      <div>
        <label htmlFor="notes" className="block text-sm font-medium text-gray-700 mb-1">
          {t("notes")}
        </label>
        <textarea
          {...register("notes")}
          id="notes"
          rows={3}
          placeholder={t("notesPlaceholder")}
          className="block w-full rounded-lg border border-gray-300 px-3 py-2 text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
        />
        {errors.notes && <p className="mt-1 text-sm text-red-600">{errors.notes.message}</p>}
      </div>

      <div className="flex items-center">
        <input
          {...register("isDefault")}
          type="checkbox"
          id="isDefault"
          className="h-4 w-4 rounded border-gray-300 text-primary focus:ring-primary"
        />
        <label htmlFor="isDefault" className="ms-2 text-sm text-gray-700">
          {t("isDefault")}
        </label>
      </div>

      <div className="flex gap-3 justify-end pt-4">
        {onCancel && (
          <Button type="button" variant="outline" onClick={onCancel} disabled={isLoading}>
            {tCommon("cancel")}
          </Button>
        )}
        <Button type="submit" isLoading={isLoading}>
          {t("save")}
        </Button>
      </div>
    </form>
  );
}
