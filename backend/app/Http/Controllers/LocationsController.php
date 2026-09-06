<?php

namespace App\Http\Controllers;

class LocationsController extends BaseController
{
    /**
     * List all countries with their ISO alpha-2 code, name, and phone dial
     * code — backs both the Country and phone-country-code dropdowns.
     */
    public function countries()
    {
        $countries = array_map(function ($country) {
            return [
                'code' => strtoupper($country['iso_3166_1_alpha2']),
                'name' => $country['name'],
                'dial_code' => '+' . $country['calling_code'],
            ];
        }, countries());

        usort($countries, fn ($a, $b) => strcmp($a['name'], $b['name']));

        return $this->sendResponse('RECORDS_FOUND', $countries);
    }

    /**
     * List the provinces/states for a given country (ISO alpha-2 code).
     * rinvex/countries ships division data as raw per-country JSON files
     * with no public accessor, so it's read directly here the same way
     * Rinvex\Country\CountryLoader loads its own country data.
     */
    public function provinces(string $code)
    {
        $path = base_path('vendor/rinvex/countries/resources/divisions/' . strtolower($code) . '.json');

        if (! file_exists($path)) {
            return $this->sendResponse('RECORDS_FOUND', []);
        }

        $divisions = json_decode(file_get_contents($path), true) ?? [];

        $provinces = [];
        foreach ($divisions as $divisionCode => $division) {
            $provinces[] = [
                'code' => $divisionCode,
                'name' => $division['name'],
            ];
        }

        usort($provinces, fn ($a, $b) => strcmp($a['name'], $b['name']));

        return $this->sendResponse('RECORDS_FOUND', $provinces);
    }
}
