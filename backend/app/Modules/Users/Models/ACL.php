<?php

namespace App\Modules\Users\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsToMany;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

use App\Models\User;

class ACL extends Model
{

    /**
     * The table associated with the model.
     *
     * @var string
     */
    protected $table = 'acl';

    /**
     * Specify the attributes that can be mass-assigned
     *
     * @var string
     */
    protected $fillable = [ 'role_id', 'group', 'category', 'path', 'title', 'controller', 'action', 'icon', 'options', 'status', 'menu_order', 'parent_id' ];

    public $timestamps = true;


    public function parent(): belongsTo
    {
        return $this->belongTo($this, 'parent_id', 'id');
    }

    /**
     * Recursively get the children for the categories post.
     */
    public function children(): HasMany
    {
        return $this->hasMany($this, 'parent_id', 'id')->where('status', 1)->with('children');
    }

    public function scopeParentsOnly($query)
    {
        return $query->whereNull('parent_id');
    }


}
