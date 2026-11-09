FROM php:8.4-cli-bookworm

RUN apt-get update && apt-get install -y \
    curl \
    git \
    unzip \
    libpq-dev \
    libonig-dev \
    libzip-dev \
    libcurl4-openssl-dev \
    && docker-php-ext-install \
        pdo_pgsql \
        mbstring \
        bcmath \
        curl \
        zip \
        pcntl \
    && apt-get clean \
    && rm -rf /var/lib/apt/lists/*

COPY --from=composer:2 /usr/bin/composer /usr/bin/composer

WORKDIR /var/www/html

EXPOSE 8000

CMD ["php", "artisan", "serve", "--host=0.0.0.0", "--port=8000"]