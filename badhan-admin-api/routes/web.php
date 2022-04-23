<?php

use Illuminate\Support\Facades\Route;

/*
|--------------------------------------------------------------------------
| Web Routes
|--------------------------------------------------------------------------
|
| Here is where you can register web routes for your application. These
| routes are loaded by the RouteServiceProvider within a group which
| contains the "web" middleware group. Now create something great!
|
*/

Route::get('/', function () {
    return view('welcome');
});
Route::get('/contributors', [App\Http\Controllers\FirebaseController::class, 'index'])->name('contributors.index');
Route::post('/contributors', [App\Http\Controllers\FirebaseController::class, 'store'])->name('contributors.store');
Route::patch('/contributors/{id}', [App\Http\Controllers\FirebaseController::class, 'update'])->name('contributors.update');
Route::delete('/contributors/{id}',[App\Http\Controllers\FirebaseController::class, 'destroy'])->name('contributors.destroy');
Route::patch('/contributors/{id}/image',[App\Http\Controllers\FirebaseController::class, 'updateImage'])->name('contributors.updateImage');;
Route::get('/frontendSettings', [App\Http\Controllers\FirebaseController::class, 'indexFrontendSettings'])->name('contributors.indexFrontendSettings');
Route::patch('/frontendSettings', [App\Http\Controllers\FirebaseController::class, 'updateFrontendSettings'])->name('contributors.updateFrontendSettings');

