<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use GuzzleHttp\Client;

class EnsureAPIKEYIsValid
{
    /**
     * Handle an incoming request.
     *
     * @param  \Illuminate\Http\Request  $request
     * @param  \Closure(\Illuminate\Http\Request): (\Illuminate\Http\Response|\Illuminate\Http\RedirectResponse)  $next
     * @return \Illuminate\Http\JsonResponse
     */
    public function handle(Request $request, Closure $next)
    {
        $client = new Client();
        $res = $client->get('http://badhan-buet.uc.r.appspot.com/users/me', ['headers' => ['x-auth' => $request->header('x-auth')]]);
        if ($res->getStatusCode() !== 200) {
            return response()->json(['status'=>401,'message'=>'Unauthorized'],401);
        }
        return $next($request);
    }
}
