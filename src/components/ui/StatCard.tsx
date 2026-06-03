"use client";

import Card from "@mui/material/Card";
import CardContent from "@mui/material/CardContent";
import Typography from "@mui/material/Typography";
import Skeleton from "@mui/material/Skeleton";

export function StatCard({
  label,
  value,
  loading,
}: {
  label: string;
  value: number | string;
  loading?: boolean;
}) {
  return (
    <Card sx={{ height: "100%" }}>
      <CardContent sx={{ p: 2.5, "&:last-child": { pb: 2.5 } }}>
        <Typography
          variant="overline"
          color="text.secondary"
          sx={{ display: "block", lineHeight: 1.4 }}
        >
          {label}
        </Typography>
        {loading ? (
          <Skeleton width={64} height={40} sx={{ mt: 0.5 }} />
        ) : (
          <Typography
            sx={{
              fontSize: 30,
              fontWeight: 700,
              letterSpacing: "-0.02em",
              lineHeight: 1.2,
              mt: 0.75,
              fontVariantNumeric: "tabular-nums",
            }}
          >
            {value}
          </Typography>
        )}
      </CardContent>
    </Card>
  );
}
