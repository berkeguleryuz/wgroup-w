"use client";

import { useTranslations } from "next-intl";

import { Button } from "@/components/ui/Button";
import { Input, Label, Textarea } from "@/components/ui/Input";
import { VideoUpload } from "@/components/editor/VideoUpload";

type Props = {
  action: (formData: FormData) => void | Promise<void>;
  titleId: string;
  nextEpisodeNumber: number;
};

export function AddEpisodeForm({ action, titleId, nextEpisodeNumber }: Props) {
  const t = useTranslations("editor");

  return (
    <form
      action={action}
      className="mt-8 space-y-5 rounded-11 border border-border p-5"
    >
      <h3 className="font-semibold">{t("newEpisode")}</h3>
      <input type="hidden" name="titleId" value={titleId} />

      <div className="grid gap-4 md:grid-cols-2">
        <div>
          <Label htmlFor="seasonNumber">{t("season")}</Label>
          <Input
            id="seasonNumber"
            name="seasonNumber"
            type="number"
            defaultValue={1}
            min={1}
          />
        </div>
        <div>
          <Label htmlFor="episodeNumber">{t("episodeNumber")}</Label>
          <Input
            id="episodeNumber"
            name="episodeNumber"
            type="number"
            defaultValue={nextEpisodeNumber}
            min={1}
          />
        </div>
      </div>

      <div>
        <Label htmlFor="name">{t("episodeName")}</Label>
        <Input id="name" name="name" required />
      </div>

      <div>
        <Label htmlFor="synopsis">{t("formSynopsis")}</Label>
        <Textarea id="synopsis" name="synopsis" rows={2} />
      </div>

      <div>
        <Label>{t("videoFile")}</Label>
        {/* Duration is read from the file's metadata — no manual entry. */}
        <VideoUpload name="videoPath" durationName="durationSec" required />
      </div>

      <div className="max-w-xs">
        <Label htmlFor="previewSec">{t("preview")}</Label>
        <Input
          id="previewSec"
          name="previewSec"
          type="number"
          min={0}
          defaultValue={60}
        />
      </div>

      <Button type="submit" variant="dark">
        {t("addEpisode")}
      </Button>
    </form>
  );
}
