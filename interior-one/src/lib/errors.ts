/** Errors the route wrapper knows how to turn into a status code. */
export class AppError extends Error {
  constructor(message: string, readonly status: number) {
    super(message);
    this.name = new.target.name;
  }
}

export class BadRequest extends AppError {
  constructor(message = 'That request is not valid.') { super(message, 400); }
}
export class Unauthorized extends AppError {
  constructor(message = 'Sign in to continue.') { super(message, 401); }
}
export class Forbidden extends AppError {
  constructor(message = 'Your role does not have access to this.') { super(message, 403); }
}
export class NotFound extends AppError {
  constructor(message = 'That no longer exists.') { super(message, 404); }
}
export class Conflict extends AppError {
  constructor(message = 'That already exists.') { super(message, 409); }
}
