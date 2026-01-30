// pages/details/[id].tsx

import { useRouter } from "next/router";
import { useEffect, useState } from "react";
import { useAuth } from "@/lib/AuthContext";
import { getPosterUrl } from "@/lib/tmdb";
import { getCountryMeta } from "@/lib/countries";
import { getDisplayCountries } from "@/lib/getDisplayCountries";
import {
  Card,
  CardHeader,
  CardBody,
  Divider,
  Image,
  Link,
  Spinner,
  Chip
} from "@nextui-org/react";

export default function DetailsPage() {
  const router = useRouter();
  const { id, type } = router.query;
  const { preferences } = useAuth();

  const [title, setTitle] = useState("");
  const [poster, setPoster] = useState<string | null>(null);
  const [backdrop, setBackdrop] = useState<string | null>(null);
  const [overview, setOverview] = useState("");
  const [releaseDate, setReleaseDate] = useState("");
  const [rating, setRating] = useState<number | null>(null);
  const [genres, setGenres] = useState<string[]>([]);
  const [homepage, setHomepage] = useState("");
  const [tagline, setTagline] = useState("");
  const [providers, setProviders] = useState<Record<string, any>>({});
  const [loading, setLoading] = useState(true);

  const favoriteCountries = preferences?.favoriteCountries ?? null;

  useEffect(() => {
    if (!id || !type) return;

    const fetchDetails = async () => {
      setLoading(true);

      // Fetch details and providers from our API routes
      const [metaRes, provRes] = await Promise.all([
        fetch(`/api/tmdb/details?id=${id}&type=${type}`),
        fetch(`/api/tmdb/providers?id=${id}&type=${type}`),
      ]);

      if (metaRes.ok) {
        const meta = await metaRes.json();
        setTitle(meta.name || meta.title || "Untitled");
        setPoster(meta.poster_path);
        setBackdrop(meta.backdrop_path);
        setOverview(meta.overview || "");
        setReleaseDate(meta.first_air_date || meta.release_date || "");
        setRating(meta.vote_average || null);
        setGenres(meta.genres?.map((g: { name: string }) => g.name) || []);
        setHomepage(meta.homepage || "");
        setTagline(meta.tagline || "");
      }

      if (provRes.ok) {
        const provData = await provRes.json();
        setProviders(provData.results || {});
      }

      setLoading(false);
    };

    fetchDetails();
  }, [id, type]);

  const countriesToShow = favoriteCountries
    ? getDisplayCountries(providers, favoriteCountries)
    : Object.keys(providers);

  const groupedByContinent: Record<string, string[]> = {};
  countriesToShow.forEach((code) => {
    const meta = getCountryMeta(code);
    const continent = meta?.continent || "Other";
    if (!groupedByContinent[continent]) groupedByContinent[continent] = [];
    groupedByContinent[continent].push(code);
  });

  return (
    <div className="relative min-h-screen w-full overflow-x-hidden">
      {backdrop && (
        <div
          className="fixed inset-0 -z-10 bg-cover bg-center blur-sm brightness-50"
          style={{ backgroundImage: `url(${getPosterUrl(backdrop, "w1280")})` }}
        />
      )}

      <div className="px-4 md:px-8 pt-8 text-white">
        {loading ? (
          <div className="text-center">
            <Spinner size="lg" label="Loading..." color="default" />
          </div>
        ) : (
          <div className="grid md:grid-cols-3 gap-8">
            <div className="md:col-span-2 space-y-8 overflow-y-auto max-h-[80vh] pr-2">
              {Object.entries(groupedByContinent).map(([continent, codes]) => (
                <div key={continent}>
                  <h2 className="text-lg font-semibold mb-4">{continent}</h2>
                  {codes.map((code) => {
                    const countryData = providers[code];
                    const countryMeta = getCountryMeta(code);
                    return (
                      <Card key={code} className="mb-6">
                        <CardHeader className="text-md font-semibold">
                          {countryMeta?.flag} {countryMeta?.name || code}
                        </CardHeader>
                        <Divider />
                        <CardBody>
                          {!(countryData?.flatrate?.length || countryData?.rent?.length || countryData?.buy?.length) ? (
                            <p className="text-sm text-default-500">No availability found.</p>
                          ) : (
                            <div className="space-y-4">
                              {["flatrate", "rent", "buy"].map((type) =>
                                countryData[type]?.length ? (
                                  <div key={type}>
                                    <h4 className="text-sm font-bold mb-2 uppercase">{type}</h4>
                                    <div className="flex flex-wrap gap-4">
                                      {countryData[type].map((provider) => (
                                        <div key={provider.provider_name} className="flex flex-col items-center">
                                          <Image
                                            src={getPosterUrl(provider.logo_path, "w92")}
                                            alt={provider.provider_name}
                                            width={48}
                                            height={48}
                                            className="rounded-md shadow"
                                          />
                                          <span className="text-xs text-center mt-1">
                                            {provider.provider_name}
                                          </span>
                                        </div>
                                      ))}
                                    </div>
                                  </div>
                                ) : null
                              )}
                            </div>
                          )}
                        </CardBody>
                      </Card>
                    );
                  })}
                </div>
              ))}
            </div>

            <div className="sticky top-20 space-y-4">
              {poster && (
                <Image
                  src={getPosterUrl(poster)}
                  alt={title}
                  width={200}
                  className="rounded-md shadow-lg"
                />
              )}
              <h1 className="text-2xl font-bold">{title}</h1>
              {tagline && <p className="italic text-default-500">{tagline}</p>}
              {releaseDate && <p className="text-sm text-default-500">Release Date: {releaseDate}</p>}
              {rating !== null && <p className="text-sm text-default-500">Rating: {rating}/10</p>}
              {genres.length > 0 && (
                <div className="flex flex-wrap gap-2">
                  {genres.map((genre) => (
                    <Chip key={genre} size="sm" color="secondary">
                      {genre}
                    </Chip>
                  ))}
                </div>
              )}
              {overview && <p className="text-sm text-default-400">{overview}</p>}
              {homepage && (
                <Link href={homepage} isExternal showAnchorIcon className="text-sm">
                  Official Website
                </Link>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}