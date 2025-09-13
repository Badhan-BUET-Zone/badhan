<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use Carbon\Carbon;
use PhpOption\None;


class CheckAlive extends Controller
{
    //
    public function __construct()
    {
    
    }

    public function index(){
        return response()->json(['status' => 200, 'message' => 'API is online'],200);
    }
}
