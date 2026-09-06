<?php

namespace App\Modules\Locations\Controllers;

use App\Http\Controllers\BaseController;

class Locations extends BaseController
{
    /**
     * Full country list (code/name/dial code) for signup and org-creation
     * dropdowns, sourced from the rinvex/countries package.
     */
    public function getCountries()
    {
        // countries() returns the unhydrated shortlist keyed by lowercase
        // ISO alpha-2 code — plain arrays, not Country objects. That's
        // deliberate: the hydrated Country::getCallingCode() assumes
        // dialling.calling_code is an array, but the shortlist stores a
        // flat calling_code string, so hydrating here would misbehave.
        $payload = collect(countries())
            ->map(fn ($country, $code) => [
                'code' => strtoupper($country['iso_3166_1_alpha2'] ?? $code),
                'name' => $country['name'] ?? null,
                'dial_code' => isset($country['calling_code']) ? '+' . $country['calling_code'] : null,
            ])
            ->filter(fn ($country) => $country['code'] && $country['name'])
            ->sortBy('name')
            ->values()
            ->all();

        return $this->sendResponse('COUNTRIES', $payload);
    }

    /**
     * Provinces/states for a given ISO 3166-1 alpha-2 country code, sourced
     * from rinvex/countries' subdivision data. Not every country has
     * subdivision data available — returns an empty list in that case
     * rather than an error, since the frontend treats provinces as optional.
     */
    public function getProvinces(string $code)
    {
        $normalized = strtolower($code);

        if (! preg_match('/^[a-z]{2}$/', $normalized)) {
            return $this->sendResponse('PROVINCES', []);
        }

        $path = base_path("vendor/rinvex/countries/resources/divisions/{$normalized}.json");
        if (! file_exists($path)) {
            return $this->sendResponse('PROVINCES', []);
        }

        $divisions = json_decode(file_get_contents($path), true) ?? [];

        $payload = collect($divisions)
            ->map(fn ($division, $divisionCode) => [
                'code' => $divisionCode,
                'name' => $division['name'] ?? $divisionCode,
            ])
            ->sortBy('name')
            ->values()
            ->all();

        return $this->sendResponse('PROVINCES', $payload);
    }
}
