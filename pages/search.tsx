import { useRouter } from "next/router";
import { useEffect, useState } from "react";
import Link from "next/link";
import { searchTMDBAll, TMDBResult } from "@/lib/tmdb";
import { Spinner, Card, CardBody } from "@nextui-org/react";
import ShowCard from "@/components/ShowCard"; // Make sure this is also Tailwind-free or migrate it

export default function SearchPage() {
  const router = useRouter();
  const { query, country } = router.query;

  const [results, setResults] = useState<TMDBResult[] | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (typeof query === "string") {
      const fetch = async () => {
        setLoading(true);
        const data = await searchTMDBAll(query);
        setResults(data);
        setLoading(false);
      };
      fetch();
    }
  }, [query]);

  return (
    <div style={{ maxWidth: "1280px", margin: "0 auto", padding: "2rem" }}>
      <h1 style={{ fontSize: "1.75rem", fontWeight: "bold", marginBottom: "1rem" }}>
        Search Results
      </h1>
      <p style={{ color: "#888", marginBottom: "1.5rem" }}>
        Showing results for <strong>{query}</strong>{" "}
        {country && (
          <>
            in <strong>{country}</strong>
          </>
        )}
      </p>

      {loading ? (
        <div style={{ display: "flex", justifyContent: "center", height: "160px" }}>
          <Spinner color="primary" />
        </div>
      ) : results && results.length > 0 ? (
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fill, minmax(150px, 1fr))",
            gap: "1rem",
          }}
        >
          {results.map((r) => (
            <Link key={r.id} href={`/details/${r.id}?type=${r.media_type}`} passHref>
              <a>
                <Card isPressable>
                  <CardBody className="p-0">
                    <ShowCard result={r} />
                  </CardBody>
                </Card>
              </a>
            </Link>
          ))}
        </div>
      ) : (
        <p style={{ color: "#aaa" }}>No results found.</p>
      )}
    </div>
  );
}