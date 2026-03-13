/**
 * Rooms & Kennels Step
 *
 * Configure facility layout: rooms, kennels, sizes, naming conventions.
 */

import React, { useState } from "react";
import {
  Box,
  TextField,
  Typography,
  Button,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Card,
  CardContent,
  IconButton,
  Chip,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Slider,
  ToggleButton,
  ToggleButtonGroup,
} from "@mui/material";
import Grid from "@mui/material/GridLegacy";
import {
  Add,
  Delete,
  ArrowForward,
  ArrowBack,
  MeetingRoom,
  Edit,
} from "@mui/icons-material";
import { useSetupWizard } from "../SetupWizardContext";
import {
  RoomConfig,
  KennelConfig,
  KennelSize,
  DEFAULT_KENNEL_SIZES,
} from "../types";
import { v4 as uuidv4 } from "uuid";

const SIZE_LABELS: Record<KennelSize, string> = {
  SMALL: "S",
  MEDIUM: "M",
  LARGE: "L",
  XLARGE: "XL",
  SUITE: "Suite",
};

const SIZE_COLORS: Record<KennelSize, string> = {
  SMALL: "#4caf50",
  MEDIUM: "#2196f3",
  LARGE: "#ff9800",
  XLARGE: "#f44336",
  SUITE: "#9c27b0",
};

export default function RoomsKennelsStep() {
  const { state, setRoomsKennels, completeStep, nextStep, prevStep } =
    useSetupWizard();
  const { roomsKennels } = state;

  const [roomDialogOpen, setRoomDialogOpen] = useState(false);
  const [editingRoom, setEditingRoom] = useState<RoomConfig | null>(null);
  const [roomName, setRoomName] = useState("");
  const [kennelCount, setKennelCount] = useState(10);
  const [kennelSize, setKennelSize] = useState<KennelSize>("MEDIUM");
  const [namingPrefix, setNamingPrefix] = useState("");

  const handleNamingConventionChange = (
    _: React.MouseEvent<HTMLElement>,
    newValue: "numeric" | "alpha" | "custom" | null
  ) => {
    if (newValue) {
      setRoomsKennels({ namingConvention: newValue });
    }
  };

  const generateKennelName = (roomName: string, index: number): string => {
    const prefix = namingPrefix || roomName.charAt(0).toUpperCase();
    switch (roomsKennels.namingConvention) {
      case "numeric":
        return `${prefix}${String(index + 1).padStart(2, "0")}`;
      case "alpha":
        return `${prefix}${String.fromCharCode(65 + index)}`;
      case "custom":
        return `${prefix}-${index + 1}`;
      default:
        return `${prefix}${index + 1}`;
    }
  };

  const openAddRoom = () => {
    setEditingRoom(null);
    setRoomName("");
    setKennelCount(10);
    setKennelSize("MEDIUM");
    setNamingPrefix("");
    setRoomDialogOpen(true);
  };

  const openEditRoom = (room: RoomConfig) => {
    setEditingRoom(room);
    setRoomName(room.name);
    setKennelCount(room.kennels.length);
    setKennelSize(room.kennels[0]?.size || "MEDIUM");
    setNamingPrefix(room.name.charAt(0));
    setRoomDialogOpen(true);
  };

  const handleSaveRoom = () => {
    const kennels: KennelConfig[] = Array.from(
      { length: kennelCount },
      (_, i) => ({
        id: uuidv4(),
        name: generateKennelName(roomName, i),
        size: kennelSize,
        capacity: 1,
      })
    );

    if (editingRoom) {
      // Update existing room
      const updatedRooms = roomsKennels.rooms.map((r) =>
        r.id === editingRoom.id ? { ...r, name: roomName, kennels } : r
      );
      setRoomsKennels({ rooms: updatedRooms });
    } else {
      // Add new room
      const newRoom: RoomConfig = {
        id: uuidv4(),
        name: roomName,
        kennels,
      };
      setRoomsKennels({ rooms: [...roomsKennels.rooms, newRoom] });
    }

    setRoomDialogOpen(false);
  };

  const handleDeleteRoom = (roomId: string) => {
    setRoomsKennels({
      rooms: roomsKennels.rooms.filter((r) => r.id !== roomId),
    });
  };

  const getTotalKennels = () => {
    return roomsKennels.rooms.reduce(
      (sum, room) => sum + room.kennels.length,
      0
    );
  };

  const handleNext = () => {
    if (roomsKennels.rooms.length > 0) {
      completeStep("rooms-kennels");
      nextStep();
    }
  };

  return (
    <Box>
      <Typography variant="h5" fontWeight="bold" gutterBottom>
        Rooms & Kennels
      </Typography>
      <Typography variant="body2" color="text.secondary" sx={{ mb: 4 }}>
        Configure your facility layout. Add rooms and specify how many kennels
        each room has.
      </Typography>

      {/* Naming Convention */}
      <Box sx={{ mb: 4 }}>
        <Typography variant="subtitle2" gutterBottom>
          Kennel Naming Convention
        </Typography>
        <ToggleButtonGroup
          value={roomsKennels.namingConvention}
          exclusive
          onChange={handleNamingConventionChange}
          size="small"
        >
          <ToggleButton value="numeric">Numeric (A01, A02...)</ToggleButton>
          <ToggleButton value="alpha">Alpha (AA, AB...)</ToggleButton>
          <ToggleButton value="custom">Custom</ToggleButton>
        </ToggleButtonGroup>
      </Box>

      {/* Rooms List */}
      <Grid container spacing={2} sx={{ mb: 3 }}>
        {roomsKennels.rooms.map((room) => (
          <Grid item xs={12} md={6} lg={4} key={room.id}>
            <Card variant="outlined">
              <CardContent>
                <Box
                  sx={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "flex-start",
                  }}
                >
                  <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                    <MeetingRoom color="primary" />
                    <Typography variant="h6">{room.name}</Typography>
                  </Box>
                  <Box>
                    <IconButton size="small" onClick={() => openEditRoom(room)}>
                      <Edit fontSize="small" />
                    </IconButton>
                    <IconButton
                      size="small"
                      onClick={() => handleDeleteRoom(room.id)}
                      color="error"
                    >
                      <Delete fontSize="small" />
                    </IconButton>
                  </Box>
                </Box>
                <Typography
                  variant="body2"
                  color="text.secondary"
                  sx={{ mt: 1 }}
                >
                  {room.kennels.length} kennels
                </Typography>
                <Box
                  sx={{ display: "flex", flexWrap: "wrap", gap: 0.5, mt: 1 }}
                >
                  {Object.entries(
                    room.kennels.reduce((acc, k) => {
                      acc[k.size] = (acc[k.size] || 0) + 1;
                      return acc;
                    }, {} as Record<string, number>)
                  ).map(([size, count]) => (
                    <Chip
                      key={size}
                      label={`${count} ${SIZE_LABELS[size as KennelSize]}`}
                      size="small"
                      sx={{
                        bgcolor: SIZE_COLORS[size as KennelSize],
                        color: "white",
                      }}
                    />
                  ))}
                </Box>
                <Typography
                  variant="caption"
                  color="text.secondary"
                  sx={{ display: "block", mt: 1 }}
                >
                  {room.kennels
                    .slice(0, 3)
                    .map((k) => k.name)
                    .join(", ")}
                  {room.kennels.length > 3 &&
                    `, +${room.kennels.length - 3} more`}
                </Typography>
              </CardContent>
            </Card>
          </Grid>
        ))}

        {/* Add Room Card */}
        <Grid item xs={12} md={6} lg={4}>
          <Card
            variant="outlined"
            sx={{
              height: "100%",
              minHeight: 150,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              cursor: "pointer",
              borderStyle: "dashed",
              "&:hover": { bgcolor: "action.hover" },
            }}
            onClick={openAddRoom}
          >
            <Box sx={{ textAlign: "center" }}>
              <Add sx={{ fontSize: 40, color: "text.secondary" }} />
              <Typography color="text.secondary">Add Room</Typography>
            </Box>
          </Card>
        </Grid>
      </Grid>

      {/* Summary */}
      {roomsKennels.rooms.length > 0 && (
        <Box sx={{ p: 2, bgcolor: "grey.100", borderRadius: 1, mb: 3 }}>
          <Typography variant="subtitle2">
            Total: {roomsKennels.rooms.length} rooms, {getTotalKennels()}{" "}
            kennels
          </Typography>
        </Box>
      )}

      {/* Room Dialog */}
      <Dialog
        open={roomDialogOpen}
        onClose={() => setRoomDialogOpen(false)}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>{editingRoom ? "Edit Room" : "Add Room"}</DialogTitle>
        <DialogContent>
          <Grid container spacing={2} sx={{ mt: 1 }}>
            <Grid item xs={12}>
              <TextField
                fullWidth
                label="Room Name"
                value={roomName}
                onChange={(e) => setRoomName(e.target.value)}
                placeholder="e.g., Suite A, Kennel Building 1"
              />
            </Grid>
            <Grid item xs={12}>
              <Typography gutterBottom>
                Number of Kennels: {kennelCount}
              </Typography>
              <Slider
                value={kennelCount}
                onChange={(_, value) => setKennelCount(value as number)}
                min={1}
                max={50}
                marks={[
                  { value: 1, label: "1" },
                  { value: 10, label: "10" },
                  { value: 25, label: "25" },
                  { value: 50, label: "50" },
                ]}
              />
            </Grid>
            <Grid item xs={12}>
              <FormControl fullWidth>
                <InputLabel>Default Kennel Size</InputLabel>
                <Select
                  value={kennelSize}
                  label="Default Kennel Size"
                  onChange={(e) => setKennelSize(e.target.value as KennelSize)}
                >
                  {DEFAULT_KENNEL_SIZES.map((size) => (
                    <MenuItem key={size.size} value={size.size}>
                      {size.label} (up to {size.maxWeight} lbs)
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={12}>
              <TextField
                fullWidth
                label="Naming Prefix"
                value={namingPrefix}
                onChange={(e) => setNamingPrefix(e.target.value.toUpperCase())}
                placeholder={roomName.charAt(0).toUpperCase() || "A"}
                helperText={`Preview: ${generateKennelName(
                  roomName || "Room",
                  0
                )}, ${generateKennelName(
                  roomName || "Room",
                  1
                )}, ${generateKennelName(roomName || "Room", 2)}...`}
              />
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setRoomDialogOpen(false)}>Cancel</Button>
          <Button
            variant="contained"
            onClick={handleSaveRoom}
            disabled={!roomName.trim()}
          >
            {editingRoom ? "Save Changes" : "Add Room"}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Navigation */}
      <Box sx={{ display: "flex", justifyContent: "space-between", mt: 4 }}>
        <Button startIcon={<ArrowBack />} onClick={prevStep}>
          Back
        </Button>
        <Button
          variant="contained"
          size="large"
          endIcon={<ArrowForward />}
          onClick={handleNext}
          disabled={roomsKennels.rooms.length === 0}
        >
          Continue
        </Button>
      </Box>
    </Box>
  );
}
