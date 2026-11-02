import React from "react";
import { Redirect } from "expo-router";
/** Keep old saved links working; the production Library owns every discovery now. */
export default function Explore() {
  return <Redirect href={{ pathname: "/library", params: { resume: "1" } }} />;
}
