<?php

namespace App\Exceptions;

use Illuminate\Foundation\Exceptions\Handler as ExceptionHandler;
use Symfony\Component\CssSelector\Exception\InternalErrorException;
use Symfony\Component\HttpKernel\Exception\TooManyRequestsHttpException;
use Throwable;

class Handler extends ExceptionHandler
{
    /**
     * A list of the exception types that are not reported.
     *
     * @var array<int, class-string<Throwable>>
     */
    protected $dontReport = [
        //
    ];

    /**
     * A list of the inputs that are never flashed for validation exceptions.
     *
     * @var array<int, string>
     */
    protected $dontFlash = [
        'current_password',
        'password',
        'password_confirmation',
    ];

    /**
     * Register the exception handling callbacks for the application.
     *
     * @return void
     */
    public function register()
    {
        $this->reportable(function (Throwable $e) {
//                return response()->json(['status'=>$e->getCode() ?: 400,'message' => $e->getMessage()]);
        });
    }

    public function render($request, Throwable $exception): \Illuminate\Http\Response|\Illuminate\Http\JsonResponse|\Symfony\Component\HttpFoundation\Response
    {
//        return parent::render($request, $exception);
        if ($exception instanceof TooManyRequestsHttpException){
            return response()->json(['status'=>429,'message'=>'Too many attempts'],429);
        }else{
            return response()->json(['status'=>$exception->getCode() ?: 500,'message' => $exception->getMessage()], $exception->getCode() ?: 500);
        }
    }
}
