import { useState, useCallback } from "react";
import api from "@/utils/axiosInstance";

export default function useLocationsApi() {
  const [countries, setCountries] = useState([]);
  const [provinces, setProvinces] = useState([]);
  const [loading, setLoading] = useState(false);

  const getCountries = useCallback(async () => {
    setLoading(true);
    try {
      const response = await api.get("/locations/countries");
      if (response?.data?.success) {
        setCountries(response.data.payload || []);
        return response.data.payload;
      }
      return null;
    } catch (err) {
      return null;
    } finally {
      setLoading(false);
    }
  }, []);

  const getProvinces = useCallback(async (countryCode) => {
    if (!countryCode) {
      setProvinces([]);
      return [];
    }
    setLoading(true);
    try {
      const response = await api.get(`/locations/countries/${countryCode}/provinces`);
      if (response?.data?.success) {
        setProvinces(response.data.payload || []);
        return response.data.payload;
      }
      setProvinces([]);
      return [];
    } catch (err) {
      setProvinces([]);
      return [];
    } finally {
      setLoading(false);
    }
  }, []);

  return { countries, provinces, loading, getCountries, getProvinces };
}
