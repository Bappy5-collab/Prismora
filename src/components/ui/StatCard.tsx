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
      <CardContent>
        <Typography variant="body2" color="text.secondary" sx={{ fontWeight: 600 }}>
          {label}
        </Typography>
        {loading ? (
          <Skeleton width={60} height={44} />
        ) : (
          <Typography sx={{ fontSize: 32, fontWeight: 700, mt: 0.5 }}>{value}</Typography>
        )}
      </CardContent>
    </Card>
  );
}
