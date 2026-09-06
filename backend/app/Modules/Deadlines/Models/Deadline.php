<?php

namespace App\Modules\Deadlines\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;

class Deadline extends Model
{
    protected $table = 'deadlines';

    protected $fillable = ['name', 'slug', 'type', 'description', 'status'];

    protected function casts(): array
    {
        return [
            'status' => 'string',
            'type'   => 'string',
        ];
    }

    public $timestamps = true;

    public function organizationDeadlines(): HasMany
    {
        return $this->hasMany(OrganizationDeadline::class, 'deadline_id');
    }
}
