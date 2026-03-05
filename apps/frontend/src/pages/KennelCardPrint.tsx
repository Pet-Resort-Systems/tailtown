import React, { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { Box, CircularProgress, Typography } from "@mui/material";
import KennelCard from "../components/kennels/KennelCard";
import { reservationService } from "../services/reservationService";
import { parseGingrDate } from "../utils/dateUtils";

/**
 * Standalone page for printing a single kennel card
 * Opens in a new window/tab for clean printing
 */
const KennelCardPrint: React.FC = () => {
  const { reservationId } = useParams<{ reservationId: string }>();
  const [reservation, setReservation] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchReservation = async () => {
      if (!reservationId) {
        setError("No reservation ID provided");
        setLoading(false);
        return;
      }

      try {
        const data = await reservationService.getReservationById(reservationId);
        setReservation(data);

        // Auto-print after a short delay to ensure rendering is complete
        setTimeout(() => {
          window.print();
        }, 500);
      } catch (err: any) {
        console.error("Error fetching reservation:", err);
        setError(err.message || "Failed to load reservation");
      } finally {
        setLoading(false);
      }
    };

    fetchReservation();
  }, [reservationId]);

  if (loading) {
    return (
      <Box
        sx={{
          display: "flex",
          justifyContent: "center",
          alignItems: "center",
          minHeight: "100vh",
        }}
      >
        <CircularProgress />
      </Box>
    );
  }

  if (error) {
    return (
      <Box
        sx={{
          display: "flex",
          justifyContent: "center",
          alignItems: "center",
          minHeight: "100vh",
        }}
      >
        <Typography color="error">{error}</Typography>
      </Box>
    );
  }

  if (!reservation || !reservation.pet || !reservation.customer) {
    return (
      <Box
        sx={{
          display: "flex",
          justifyContent: "center",
          alignItems: "center",
          minHeight: "100vh",
        }}
      >
        <Typography color="error">Invalid reservation data</Typography>
      </Box>
    );
  }

  // Parse pet icons - they're stored as JSON string in the database
  const petIconIds = (() => {
    try {
      if (Array.isArray(reservation.pet.petIcons)) {
        return reservation.pet.petIcons;
      }
      if (typeof reservation.pet.petIcons === "string") {
        return JSON.parse(reservation.pet.petIcons);
      }
      return [];
    } catch (error) {
      console.error("Error parsing pet icons:", error);
      return [];
    }
  })();

  // Parse icon notes if they exist
  const customNotes = (() => {
    try {
      if (
        reservation.pet.iconNotes &&
        typeof reservation.pet.iconNotes === "object"
      ) {
        return reservation.pet.iconNotes;
      }
      if (typeof reservation.pet.iconNotes === "string") {
        return JSON.parse(reservation.pet.iconNotes);
      }
      return {};
    } catch (error) {
      console.error("Error parsing icon notes:", error);
      return {};
    }
  })();

  return (
    <KennelCard
      kennelNumber={reservation.resource?.name || "N/A"}
      suiteType={reservation.resource?.type || "STANDARD"}
      petName={reservation.pet.name}
      petBreed={reservation.pet.breed || ""}
      petWeight={reservation.pet.weight}
      petIconIds={petIconIds}
      petType={reservation.pet.type as "DOG" | "CAT" | "OTHER"}
      customNotes={customNotes}
      petNotes={reservation.pet.notes || reservation.notes || ""}
      ownerName={`${reservation.customer.firstName || ""} ${
        reservation.customer.lastName || ""
      }`.trim()}
      ownerPhone={reservation.customer.phone || ""}
      startDate={parseGingrDate(reservation.startDate) || new Date()}
      endDate={parseGingrDate(reservation.endDate) || new Date()}
      alerts={reservation.alerts || []}
    />
  );
};

export default KennelCardPrint;
