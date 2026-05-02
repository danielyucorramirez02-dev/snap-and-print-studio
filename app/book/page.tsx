import { getServicesForBooking } from "@/app/book/actions";
import BookingFlow from "@/components/booking-page/BookingFlow";

export default async function BookPage() {
  const services = await getServicesForBooking();

  return <BookingFlow services={services} />;
}
