<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('publikasi', function (Blueprint $table) {
            $table->id();
            $table->string('slug')->unique();
            $table->string('title');
            $table->string('category');
            $table->unsignedSmallInteger('year');
            $table->text('authors');
            $table->string('source_name');
            $table->string('source_detail')->nullable();
            $table->string('indeks', 50)->nullable();
            $table->text('description')->nullable();
            $table->string('href')->nullable();
            $table->string('cover_path')->nullable();
            $table->string('file_path')->nullable();
            $table->timestamps();

            $table->index('category');
            $table->index('year');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('publikasi');
    }
};