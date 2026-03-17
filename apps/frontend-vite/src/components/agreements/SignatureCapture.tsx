import React, { useRef, useEffect, useState, useCallback } from 'react';
import { Box, Button, Typography, Paper } from '@mui/material';
import { Clear as ClearIcon } from '@mui/icons-material';

interface SignatureCaptureProps {
  onSignatureChange: (signature: string | null) => void;
  width?: number;
  height?: number;
  lineColor?: string;
  lineWidth?: number;
  disabled?: boolean;
}

const SignatureCapture: React.FC<SignatureCaptureProps> = ({
  onSignatureChange,
  width = 400,
  height = 150,
  lineColor = '#000000',
  lineWidth = 2,
  disabled = false,
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [hasSignature, setHasSignature] = useState(false);
  const lastPosRef = useRef<{ x: number; y: number } | null>(null);

  // Initialize canvas
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Set canvas size
    canvas.width = width;
    canvas.height = height;

    // Set drawing styles
    ctx.strokeStyle = lineColor;
    ctx.lineWidth = lineWidth;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';

    // Fill with white background
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, width, height);
  }, [width, height, lineColor, lineWidth]);

  const getCoordinates = useCallback(
    (
      event: React.MouseEvent | React.TouchEvent
    ): { x: number; y: number } | null => {
      const canvas = canvasRef.current;
      if (!canvas) return null;

      const rect = canvas.getBoundingClientRect();
      const scaleX = canvas.width / rect.width;
      const scaleY = canvas.height / rect.height;

      if ('touches' in event) {
        const touch = event.touches[0];
        return {
          x: (touch.clientX - rect.left) * scaleX,
          y: (touch.clientY - rect.top) * scaleY,
        };
      }

      return {
        x: (event.clientX - rect.left) * scaleX,
        y: (event.clientY - rect.top) * scaleY,
      };
    },
    []
  );

  const startDrawing = useCallback(
    (event: React.MouseEvent | React.TouchEvent) => {
      if (disabled) return;

      event.preventDefault();
      const coords = getCoordinates(event);
      if (!coords) return;

      setIsDrawing(true);
      lastPosRef.current = coords;
    },
    [disabled, getCoordinates]
  );

  const draw = useCallback(
    (event: React.MouseEvent | React.TouchEvent) => {
      if (!isDrawing || disabled) return;

      event.preventDefault();
      const canvas = canvasRef.current;
      const ctx = canvas?.getContext('2d');
      if (!canvas || !ctx || !lastPosRef.current) return;

      const coords = getCoordinates(event);
      if (!coords) return;

      ctx.beginPath();
      ctx.moveTo(lastPosRef.current.x, lastPosRef.current.y);
      ctx.lineTo(coords.x, coords.y);
      ctx.stroke();

      lastPosRef.current = coords;

      if (!hasSignature) {
        setHasSignature(true);
      }
    },
    [isDrawing, disabled, getCoordinates, hasSignature]
  );

  const stopDrawing = useCallback(() => {
    if (!isDrawing) return;

    setIsDrawing(false);
    lastPosRef.current = null;

    // Export signature as base64
    const canvas = canvasRef.current;
    if (canvas && hasSignature) {
      const signature = canvas.toDataURL('image/png');
      onSignatureChange(signature);
    }
  }, [isDrawing, hasSignature, onSignatureChange]);

  const clearSignature = useCallback(() => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext('2d');
    if (!canvas || !ctx) return;

    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    setHasSignature(false);
    onSignatureChange(null);
  }, [onSignatureChange]);

  return (
    <Box>
      <Box
        display="flex"
        justifyContent="space-between"
        alignItems="center"
        mb={1}
      >
        <Typography variant="subtitle2" color="textSecondary">
          Sign below
        </Typography>
        {hasSignature && (
          <Button
            size="small"
            startIcon={<ClearIcon />}
            onClick={clearSignature}
            disabled={disabled}
          >
            Clear
          </Button>
        )}
      </Box>
      <Paper
        variant="outlined"
        sx={{
          display: 'inline-block',
          cursor: disabled ? 'not-allowed' : 'crosshair',
          touchAction: 'none',
          opacity: disabled ? 0.6 : 1,
        }}
      >
        <canvas
          ref={canvasRef}
          style={{
            display: 'block',
            maxWidth: '100%',
            height: 'auto',
          }}
          onMouseDown={startDrawing}
          onMouseMove={draw}
          onMouseUp={stopDrawing}
          onMouseLeave={stopDrawing}
          onTouchStart={startDrawing}
          onTouchMove={draw}
          onTouchEnd={stopDrawing}
        />
      </Paper>
      <Typography
        variant="caption"
        color="textSecondary"
        display="block"
        mt={0.5}
      >
        Use your mouse or finger to sign
      </Typography>
    </Box>
  );
};

export default SignatureCapture;
