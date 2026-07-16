import ListingClient from "./ListingClient";

export default async function ListingPage({ params }) {
  const { id } = await params;
  return <ListingClient id={id} />;
}
